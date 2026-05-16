{-# LANGUAGE LambdaCase #-}
{-# LANGUAGE OverloadedStrings #-}
{-# LANGUAGE NoImplicitPrelude #-}

--------------------------------------------------------------------------------

import Hakyll
import Text.Pandoc.Options

import Hakyll.Core.Compiler.Internal
import Relude hiding (fromList)
import Text.Pandoc hiding (lookupEnv)
import Text.Pandoc.Walk

--------------------------------------------------------------------------------
main :: IO ()
main = do
  prod <- isJust <$> lookupEnv "PROD"
  let myDefaultContext =
        mconcat
          [ boolField "prod" (const prod)
          , constField "root" root
          , defaultContext
          ]
  hakyll $ do
    match "images/*" $ do
      route idRoute
      compile copyFileCompiler

    match "wasm/*" $ do
      route idRoute
      compile copyFileCompiler

    match "js/*" $ do
      route idRoute
      compile copyFileCompiler

    match "css/*" $ do
      route idRoute
      compile compressCssCompiler

    match (fromList ["CNAME", "favicon.ico", "robots.txt"]) $ do
      route idRoute
      compile copyFileCompiler

    let getVisibleTags ident = do
          h <- isHidden ident
          if h then pure [] else getTags ident
    tags <- buildTagsWith getVisibleTags "posts/**" (fromCapture "tags/*.html")
    let myPostCtx =
          mconcat
            [ dateField "date" "%B %e, %Y"
            , tagsField "tags" tags
            , hiddenNoindexField
            , myDefaultContext
            ]
    tagsRules tags $ \tag pat -> do
      route idRoute
      compile $ do
        posts <- recentFirst =<< loadAll pat
        let myTagPageCtx =
              mconcat
                [ listField "posts" myPostCtx (return posts)
                , constField "title" $ "Posts tagged \"" ++ tag ++ "\""
                , boolField "noindex" (pure True)
                , myDefaultContext
                ]

        makeItem ""
          >>= loadAndApplyTemplate "templates/tag.html" myTagPageCtx
          >>= loadAndApplyTemplate "templates/default.html" myTagPageCtx
          >>= relativizeUrls

    match "posts/**" $ do
      route $ setExtension "html"
      compile
        $ customPandocCompiler
        >>= saveSnapshot "content"
        >>= loadAndApplyTemplate "templates/post.html" myPostCtx
        >>= loadAndApplyTemplate "templates/default.html" myPostCtx
        >>= relativizeUrls

    create ["archive.html"] $ do
      route idRoute
      compile $ do
        posts <- recentFirst =<< excludeHidden =<< loadAll "posts/**"
        tagList <- renderTagList tags
        let myArchiveCtx =
              mconcat
                [ listField "posts" myPostCtx (return posts)
                , constField "taglist" tagList
                , constField "title" "Archives"
                , myDefaultContext
                ]

        makeItem ""
          >>= loadAndApplyTemplate "templates/archive.html" myArchiveCtx
          >>= loadAndApplyTemplate "templates/default.html" myArchiveCtx
          >>= relativizeUrls

    match "about.html" $ do
      route idRoute
      compile $ do
        let myAboutCtx =
              mconcat
                [ constField "title" "About"
                , myDefaultContext
                ]

        makeItem ""
          >>= loadAndApplyTemplate "templates/about.html" myAboutCtx
          >>= loadAndApplyTemplate "templates/default.html" myAboutCtx
          >>= relativizeUrls

    create ["sitemap.xml"] $ do
      route idRoute
      compile $ do
        posts <- recentFirst =<< excludeHidden =<< loadAll "posts/*"
        pages <- loadAll "pages/*"
        let allPages = return (pages ++ posts)
        let sitemapCtx =
              mconcat
                [ listField "pages" myPostCtx allPages
                , myDefaultContext
                ]
        makeItem ""
          >>= loadAndApplyTemplate "templates/sitemap.xml" sitemapCtx

    match "index.html" $ do
      route idRoute
      compile $ do
        posts <- fmap (take 5) . recentFirst =<< excludeHidden =<< loadAllSnapshots "posts/*" "content"
        let myTeaserPostCtx =
              teaserField "teaser" "content" <> myPostCtx
            myIndexCtx =
              mconcat
                [ listField "posts" myTeaserPostCtx (return posts)
                , constField "canonical" (root ++ "/")
                , constField "homepage" "yes"
                , myDefaultContext
                ]

        getResourceBody
          >>= applyAsTemplate myIndexCtx
          >>= loadAndApplyTemplate "templates/default.html" myIndexCtx
          >>= relativizeUrls

    create ["rss.xml"] $ do
      route idRoute
      compile $ do
        let feedCtx = myPostCtx <> bodyField "description"
        posts <-
          fmap (take 10) . recentFirst
            =<< excludeHidden
            =<< loadAllSnapshots "posts/*" "content"
        renderRss myFeedConfiguration feedCtx posts

    match "about/*" $ compile templateBodyCompiler
    match "templates/*" $ compile templateBodyCompiler

--------------------------------------------------------------------------------

--------------------------------------------------------------------------------
-- Utility Functions
--------------------------------------------------------------------------------

isHidden :: (MonadMetadata m) => Identifier -> m Bool
isHidden ident = do
  mb <- getMetadataField ident "hidden"
  pure $ case mb of
    Just v | v /= "" && v /= "false" -> True
    _ -> False

excludeHidden :: [Item a] -> Compiler [Item a]
excludeHidden = filterM (fmap not . isHidden . itemIdentifier)

hiddenNoindexField :: Context a
hiddenNoindexField = field "noindex" $ \item -> do
  h <- isHidden (itemIdentifier item)
  if h then pure "true" else noResult "post is not hidden"

texifyInline :: Inline -> PandocIO Inline
texifyInline = \case
  Math dispType typstMath -> do
    texMathMb <- readTypst def ("$ " <> typstMath <> " $")
    let texMath = case texMathMb of
          (Pandoc _ [Para [Math _disp texMathText]]) -> texMathText
          _huh -> toText $ "could not parse ????: " ++ show texMathMb
    pure $ Math dispType texMath
  x -> pure x

-- | converts a Pandoc document with inline Typst to inline TeX
texifyTypst :: Pandoc -> IO Pandoc
texifyTypst (Pandoc meta blocks) = do
  blocksMb' <- runIO $ walkM texifyInline blocks
  blocks' <- handleError blocksMb'
  pure $ Pandoc meta blocks'

--------------------------------------------------------------------------------
-- Blog Descriptions
--------------------------------------------------------------------------------

root :: String
root = "https://hcentner.dev"

myFeedConfiguration :: FeedConfiguration
myFeedConfiguration =
  FeedConfiguration
    { feedTitle = "hcentner's blog"
    , feedDescription = "Harrison Centner's personal blog"
    , feedAuthorName = "Harrison Centner"
    , feedAuthorEmail = ""
    , feedRoot = root
    }

customPandocCompiler :: Compiler (Item String)
customPandocCompiler =
  let myExtensions =
        mconcat
          $ map
            enableExtension
            [ Ext_lists_without_preceding_blankline
            , Ext_fancy_lists
            , Ext_example_lists
            , Ext_definition_lists
            , Ext_tex_math_single_backslash
            ]
      defaultReaderExtensions = readerExtensions defaultHakyllReaderOptions
      readerOptions =
        defaultHakyllReaderOptions
          { readerExtensions = myExtensions defaultReaderExtensions
          }

      defaultWriterExtensions = writerExtensions defaultHakyllWriterOptions
      writerOptions =
        defaultHakyllWriterOptions
          { writerExtensions = enableExtension Ext_tex_math_single_backslash defaultWriterExtensions
          , writerHTMLMathMethod = MathJax ""
          }
   in pandocCompilerWithTransformM readerOptions writerOptions (compilerUnsafeIO . texifyTypst)
