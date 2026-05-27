{- | The site stylesheet, ported from the original @static\/css\/default.css@
to the <https://hackage.haskell.org/package/clay clay> CSS EDSL.

All theme-varying colors come from @Design.Tokens@ (the single source of
truth). The three CSS custom-property blocks (@:root@, the
@prefers-color-scheme: dark@ media block, and the @:root[data-theme="dark"]@
override) are generated programmatically from 'lightPalette' / 'darkPalette'
via the shared 'paletteVars' helper, so they can never drift apart.

== Name clashes

@Clay@ is imported unqualified because the whole module is written in its
EDSL. Clay exports a large surface that collides with Relude/Prelude (@rem@,
@div@, @empty@, @(&)@, @(**)@, @not@, @all@, @span@, @map@, @filter@, etc.).
This module needs essentially nothing from Relude except 'Text' and '(<>)',
so it imports only those two names explicitly from @Relude@ and pulls
everything else from @Clay@ unqualified. That avoids every clash without a
long hide-list. The EDSL relies on 'Clay.Stylesheet.-:' (raw declarations),
'Clay.Render.renderWith', 'Clay.Stylesheet.?', 'Clay.Stylesheet.query',
'Clay.Stylesheet.important', 'Clay.Selector.selectorFromText', and the
@Clay.Media@ feature builders.

Every property value is emitted through clay's raw escape hatch
'Clay.Stylesheet.-:' so the rendered CSS is byte-for-byte identical to the
hand-written original (verified by a prettier-normalized diff); selectors use
'Clay.Selector.selectorFromText' so grouped / attribute / pseudo selectors
reproduce the original syntax verbatim.
-}
module Design.Css (
    stylesheet,
    renderedCss,
) where

import Clay
import Clay.Media qualified as Media
import Clay.Render (banner)
import Clay.Selector (selectorFromText)
import Data.Text.Lazy qualified as LText
import Design.Tokens (Palette)
import Design.Tokens qualified as T
import Relude (Text)
import Prelude hiding (rem)

-- | The complete stylesheet.
stylesheet :: Css
stylesheet = do
    themeVarBlocks
    applyVarsAndBorders
    universalReset
    codeColors
    html5DisplayReset
    blockReset
    pageLayout
    styling
    mediaMax54
    mediaMax32
    mediaMax22
    authPages

-- | The rendered stylesheet, without clay's banner comment.
renderedCss :: LText.Text
renderedCss = renderWith pretty{banner = False} [] stylesheet

-- ---------------------------------------------------------------------------
-- Raw-value helpers
-- ---------------------------------------------------------------------------

{- | Emit the ten @--*@ custom-property declarations for a palette, in the
original CSS order: bg, text, border, code-bg, code-text, primary, secondary,
dark-grey, medium-grey, light-grey. Shared by all three theme blocks so the
light/dark values stay in sync with the palettes.
-}
paletteVars :: Palette -> Css
paletteVars pal = do
    "--bg-color" -: T.bgColor pal
    "--text-color" -: T.textColor pal
    "--border-color" -: T.borderColor pal
    "--code-bg" -: T.codeBg pal
    "--code-text" -: T.codeText pal
    "--primary-color" -: T.primaryColor pal
    "--secondary-color" -: T.secondaryColor pal
    "--dark-grey-color" -: T.darkGreyColor pal
    "--medium-grey-color" -: T.mediumGreyColor pal
    "--light-grey-color" -: T.lightGreyColor pal

-- | A @var(--name)@ reference as a raw value string.
varColor :: Text -> Text
varColor varName = "var(" <> varName <> ")"

-- ---------------------------------------------------------------------------
-- Theme variable blocks (default.css lines 23-70)
-- ---------------------------------------------------------------------------

themeVarBlocks :: Css
themeVarBlocks = do
    -- Light mode (default).
    selectorFromText ":root" ? paletteVars T.lightPalette
    -- Dark mode — only when the user prefers dark and has not forced light.
    -- clay cannot emit a bare @\@media (prefers-color-scheme: dark)@ (a media
    -- type is mandatory); @Media.all@ renders @\@media all and (...)@, which is
    -- semantically identical to the original's type-less query (a missing media
    -- type defaults to @all@). Using @screen@ would change behavior (it excludes
    -- print), so @all@ is the faithful choice.
    query Media.all [Media.prefersColorScheme Media.dark] $
        selectorFromText ":root:not([data-theme=\"light\"])" ? paletteVars T.darkPalette
    -- Explicit dark-mode toggle override.
    selectorFromText ":root[data-theme=\"dark\"]" ? paletteVars T.darkPalette

-- ---------------------------------------------------------------------------
-- Apply the variables + borders + heading colors (lines 72-95)
-- ---------------------------------------------------------------------------

applyVarsAndBorders :: Css
applyVarsAndBorders = do
    selectorFromText "body" ? do
        "background-color" -: varColor "--bg-color"
        "color" -: varColor "--text-color"
    selectorFromText "body::before, body::after, footer, .sidebar-container, .teaser::after" ? do
        important $ "border-color" -: varColor "--border-color"
    selectorFromText "h1, h2, h3, h4" ? do
        "color" -: varColor "--dark-grey-color"
    selectorFromText ".byline, .tags, .prerequisites, footer" ? do
        "color" -: varColor "--light-grey-color"

-- ---------------------------------------------------------------------------
-- The universal reset selector list (lines 97-117)
-- ---------------------------------------------------------------------------

universalReset :: Css
universalReset =
    selectorFromText universalResetSelector ? do
        "margin" -: "0"
        "padding" -: "0"
        "border" -: "0"
        "font-size" -: "100%"
        "font" -: "inherit"
        "vertical-align" -: "baseline"
        "color" -: varColor "--dark-grey-color"

universalResetSelector :: Text
universalResetSelector =
    "html, body, div, span, applet, object, iframe, \
    \h1, h2, h3, h4, h5, h6, p, blockquote, pre, \
    \a, abbr, acronym, address, big, cite, \
    \del, dfn, em, img, ins, kbd, q, s, samp, \
    \small, strike, strong, sub, sup, tt, var, \
    \b, u, center, \
    \dl, dt, dd, ol, ul, li, \
    \fieldset, form, label, legend, \
    \table, caption, tbody, tfoot, thead, tr, th, td, \
    \article, aside, canvas, details, embed, \
    \figure, figcaption, footer, header, hgroup, \
    \menu, nav, output, ruby, section, summary, \
    \time, mark, audio, video"

-- ---------------------------------------------------------------------------
-- Code colors (lines 121-124)
-- ---------------------------------------------------------------------------

codeColors :: Css
codeColors =
    selectorFromText "code" ? do
        "background-color" -: varColor "--code-bg"
        "color" -: varColor "--code-text"

-- ---------------------------------------------------------------------------
-- HTML5 display-role reset (lines 127-130)
-- ---------------------------------------------------------------------------

html5DisplayReset :: Css
html5DisplayReset =
    selectorFromText "aside, details, figcaption, figure, footer, header, hgroup, menu, nav, section" ? do
        "display" -: "block"

-- ---------------------------------------------------------------------------
-- article / ul / ol / line-height / blockquote / table / img (lines 132-165)
-- ---------------------------------------------------------------------------

blockReset :: Css
blockReset = do
    selectorFromText "article" ? do
        "display" -: "block"
        "margin-left" -: "3rem"
    selectorFromText "ul" ? do
        "list-style-type" -: "none"
        "margin-left" -: "1.5em"
    selectorFromText ".content ul" ? do
        "list-style-type" -: "disc"
        "margin-left" -: "1.5em"
    selectorFromText "ol" ? do
        "list-style-type" -: "decimal"
        "margin-left" -: "1.5em"
    selectorFromText "body" ? do
        "line-height" -: "1"
    selectorFromText "blockquote, q" ? do
        "quotes" -: "none"
    selectorFromText "blockquote:before, blockquote:after, q:before, q:after" ? do
        "content" -: "''"
        "content" -: "none"
    selectorFromText "table" ? do
        "border-collapse" -: "collapse"
        "border-spacing" -: "0"
    selectorFromText "img" ? do
        "display" -: "block"

-- ---------------------------------------------------------------------------
-- Page layout (lines 169-341)
-- ---------------------------------------------------------------------------

pageLayout :: Css
pageLayout = do
    selectorFromText "html" ? do
        "font-size" -: "0.7em"
    selectorFromText "body" ? do
        "display" -: "grid"
        "grid-template-columns" -: "[left] 16rem [logo-right] 1fr [right]"
        "grid-template-rows" -: "[top] auto [content-top] auto [content-bottom] auto [bottom]"
        "max-width" -: "90rem"
        "margin" -: "auto"
        "padding-left" -: "1.5rem"
        "padding-right" -: "1.5rem"
        "box-sizing" -: "border-box"
        "overflow-x" -: "hidden"
        "font-family" -: T.bodyFontStack T.fonts
        "position" -: "relative"
    selectorFromText "body::before" ? do
        "content" -: "\"\""
        "position" -: "absolute"
        "left" -: "calc(16rem + 1.5rem)"
        "top" -: "calc(var(--header-height, 8rem) + 2rem)"
        "bottom" -: "8rem"
        "width" -: "1px"
        "background-color" -: varColor "--border-color"
        "z-index" -: "0"
    selectorFromText "header.logo" ? do
        "grid-column" -: "left / logo-right"
        "grid-row" -: "top / content-top"
        "padding-bottom" -: "1rem"
        "justify-self" -: "end"
        "margin-top" -: "1rem"
    selectorFromText ".logo-container" ? do
        "display" -: "flex"
        "flex-direction" -: "row"
        "justify-content" -: "flex-start"
        "width" -: "fit-content"
    selectorFromText ".logo-img" ? do
        "width" -: "clamp(5rem, 12vw, 10rem)"
    selectorFromText "header.blog-title" ? do
        "grid-column" -: "logo-right / right"
        "grid-row" -: "top / content-top"
        "align-self" -: "end"
    selectorFromText "body::after" ? do
        "content" -: "\"\""
        "grid-column" -: "left / right"
        "grid-row" -: "top / content-top"
        "align-self" -: "end"
        "border-bottom" -: "1px solid var(--border-color)"
    selectorFromText ".blog-title-container" ? do
        "margin-bottom" -: "0.5rem"
        "margin-left" -: "2rem"
    selectorFromText "main" ? do
        "grid-column" -: "left / right"
        "grid-row" -: "content-top / content-bottom"
        "margin-left" -: "16rem"
    selectorFromText "main main" ? do
        "margin-left" -: "0"
    selectorFromText ".main-container" ? do
        "margin-top" -: "2rem"
        "margin-bottom" -: "2rem"
    selectorFromText "nav" ? do
        "text-align" -: "right"
        "grid-column" -: "left / right"
        "grid-row" -: "content-top / content-bottom"
        "width" -: "14rem"
        "margin-bottom" -: "2rem"
    selectorFromText ".sidebar-container" ? do
        "margin-right" -: "1rem"
        "margin-top" -: "2rem"
        "display" -: "flex"
        "flex-direction" -: "column"
    selectorFromText "nav a" ? do
        "margin-bottom" -: "0.75rem"
        "margin-top" -: "0.75rem"
    selectorFromText "#theme-toggle" ? do
        "font-family" -: "inherit"
        "font-size" -: "1.8rem"
        "text-transform" -: "uppercase"
        "padding" -: "0.2rem 0.4rem"
        "border" -: "1px solid var(--primary-color)"
        "border-radius" -: "3px"
        "background" -: "none"
        "color" -: varColor "--primary-color"
        "cursor" -: "pointer"
        "margin-top" -: "auto"
        "margin-bottom" -: "0.75rem"
        "text-decoration" -: "none"
        "width" -: "6.5ch"
        "text-align" -: "center"
        "align-self" -: "flex-end"
    selectorFromText "#theme-toggle:hover" ? do
        "text-decoration" -: "underline"
    selectorFromText "footer" ? do
        "padding-top" -: "1rem"
        "padding-bottom" -: "3rem"
        "padding-left" -: "1rem"
        "padding-right" -: "1rem"
        "border-top" -: "1px solid var(--border-color)"
        "grid-column" -: "left / right"
        "grid-row" -: "content-bottom / bottom"
        "margin-left" -: "6rem"
        "display" -: "flex"
        "flex-wrap" -: "nowrap"
        "align-items" -: "center"
        "justify-content" -: "end"
        "white-space" -: "nowrap"
    selectorFromText ".footer-box" ? do
        "flex-basis" -: "0"
        "flex-grow" -: "1"
        "padding-left" -: "1rem"
        "padding-right" -: "1rem"
    selectorFromText ".comments" ? do
        "margin-top" -: "1rem"
    selectorFromText ".teaser" ? do
        "margin-top" -: "-0.5rem"
        "margin-bottom" -: "2rem"
        "padding-bottom" -: "2rem"
        "border-bottom" -: "none"
        "margin-left" -: "-3rem"
    selectorFromText ".teaser::after" ? do
        "content" -: "\"\""
        "padding-bottom" -: "2rem"
        "position" -: "absolute"
        "left" -: "calc(18.75rem + 1.5rem)"
        "right" -: "0"
        "height" -: "1px"
        "border-bottom" -: "1px solid var(--border-color)"

-- ---------------------------------------------------------------------------
-- Styling (lines 343-590)
-- ---------------------------------------------------------------------------

styling :: Css
styling = do
    selectorFromText "body" ? do
        "font-size" -: "2rem"
        "font-family" -: T.bodyFontStack T.fonts
        "letter-spacing" -: "0.02rem"
        "line-height" -: "1.4"
        "text-rendering" -: "optimizeLegibility"
        "font-kerning" -: "normal"
        "font-feature-settings" -: "\"kern\""
        "color" -: "#000"
    selectorFromText "a" ? do
        "text-decoration" -: "none"
        "color" -: varColor "--primary-color"
    selectorFromText "a:hover" ? do
        "text-decoration" -: "underline"
    selectorFromText "sup" ? do
        "vertical-align" -: "super"
        "font-size" -: "80%"
    selectorFromText "footer .fa-ul" ? do
        "margin-left" -: "1.5em"
    selectorFromText "nav a" ? do
        "font-size" -: "1.8rem"
        "text-transform" -: "uppercase"
    selectorFromText ".blog-title a" ? do
        "font-size" -: "clamp(2.4rem, 8vw, 4.6rem)"
        "font-weight" -: "bold"
        "color" -: varColor "--primary-color"
        "text-decoration" -: "none"
        "padding-left" -: "1rem"
        "white-space" -: "nowrap"
    selectorFromText "i" ? do
        "color" -: varColor "--primary-color"
    selectorFromText "h1" ? do
        "font-size" -: "2.8rem"
        "font-weight" -: "bold"
        "letter-spacing" -: "0"
        "margin-bottom" -: "1rem"
        "color" -: varColor "--primary-color"
    selectorFromText ".byline, .tags, .prerequisites" ? do
        "font-size" -: "1.5rem"
        "font-style" -: "italic"
        "color" -: varColor "--light-grey-color"
    selectorFromText ".article-title" ? do
        "margin-bottom" -: "1.5rem"
    selectorFromText ".article-title h1" ? do
        "margin-bottom" -: "0.1rem"
    selectorFromText ".hidden-tag" ? do
        "font-size" -: "1.5rem"
        "font-style" -: "italic"
        "font-weight" -: "normal"
        "color" -: varColor "--light-grey-color"
        "margin-left" -: "0.5rem"
    selectorFromText "h2" ? do
        "font-size" -: "2.6rem"
        "font-weight" -: "500"
        "margin-top" -: "2.2rem"
        "margin-bottom" -: "0.4rem"
        "color" -: varColor "--dark-grey-color"
    selectorFromText "h3" ? do
        "font-size" -: "2.1rem"
        "margin-top" -: "1.6rem"
        "margin-bottom" -: "0.6rem"
    selectorFromText "h4" ? do
        "font-size" -: "1.8rem"
        "font-weight" -: "500"
        "margin-top" -: "1rem"
        "margin-bottom" -: "0.4rem"
    selectorFromText "figcaption" ? do
        "font-size" -: "1.5rem"
        "font-style" -: "italic"
        "margin-top" -: "-1rem"
        "margin-left" -: "4rem"
        "margin-right" -: "4rem"
        "margin-bottom" -: "2rem"
        "text-align" -: "center"
        "font-family" -: T.bodyTextFont T.fonts
    selectorFromText "em" ? do
        "font-style" -: "italic"
    selectorFromText ".article-body p" ? do
        "font-size" -: "1.5rem"
        "font-family" -: T.bodyTextFont T.fonts
        "margin-bottom" -: "0.75rem"
        "color" -: varColor "--dark-grey-color"
    selectorFromText ".article-body ol, .article-body ul" ? do
        "font-size" -: "1.5rem"
        "font-family" -: T.bodyTextFont T.fonts
        "margin-bottom" -: "0.75rem"
    selectorFromText ".article-body li" ? do
        "margin-bottom" -: "0.75rem"
    selectorFromText "code" ? do
        "background-color" -: varColor "--code-bg"
        "padding" -: "0.2em 0.4em"
        "border-radius" -: "4px"
        "font-family" -: "monospace"
        "font-size" -: "0.95em"
    selectorFromText "strong" ? do
        "font-weight" -: "bold"
    selectorFromText "footer" ? do
        "font-size" -: "1.5rem"
        "color" -: varColor "--light-grey-color"
    selectorFromText "footer h2" ? do
        "font-weight" -: "normal"
        "font-size" -: "1.8rem"
        "text-transform" -: "uppercase"
        "margin-top" -: "0"
        "margin-bottom" -: "1rem"
        "letter-spacing" -: "0"
    selectorFromText "ol, ul" ? do
        "padding-top" -: "0.5rem"
        "padding-bottom" -: "0.5rem"
    selectorFromText ".post-title-link" ? do
        "color" -: varColor "--primary-color"
    selectorFromText ".tagslist" ? do
        "padding-left" -: "1rem"
        "padding-top" -: "0.5rem"
        "padding-bottom" -: "0.5rem"
    selectorFromText ".mjpage__block" ? do
        "display" -: "block"
        "text-align" -: "center"
        "margin" -: "1em 0"
    selectorFromText ".center" ? do
        "display" -: "block"
        "margin-left" -: "auto"
        "margin-right" -: "auto"
    selectorFromText ".image-large" ? do
        "width" -: "40rem"
    selectorFromText ".image-pad-vertical" ? do
        "padding-top" -: "2rem"
        "padding-bottom" -: "2rem"
    selectorFromText ".image-very-large" ? do
        "width" -: "100%"
    selectorFromText ".image-medium" ? do
        "width" -: "30rem"
    selectorFromText ".image-small" ? do
        "width" -: "20rem"
    selectorFromText ".theorem" ? do
        "border-left" -: "0.5rem solid " <> T.accentBorder
        "padding" -: "1rem"
        "margin" -: "1rem 0rem"
        "background-color" -: varColor "--primary-color"
        "border-radius" -: "1rem"
    selectorFromText ".definition" ? do
        "border-left" -: "0.5rem solid " <> T.accentBorder
        "padding" -: "1rem"
        "margin" -: "1rem 0rem"
        "background-color" -: varColor "--primary-color"
        "border-radius" -: "1rem"
    selectorFromText ".comments" ? do
        "text-align" -: "center"
    selectorFromText "#show-comments-button" ? do
        "width" -: "60%"
        "height" -: "4rem"
        "margin" -: "2rem 0"
        "padding" -: "0"
        "font-family" -: "Dosis"
        "font-size" -: "1.8rem"
        "color" -: varColor "--primary-color"
        "-moz-appearance" -: "none"
        "-webkit-appearance" -: "none"
        "border" -: "none"
        "background" -: "none"
        "text-transform" -: "uppercase"
        "cursor" -: "pointer"
    selectorFromText "#show-comments-button:hover" ? do
        "text-decoration" -: "underline"

-- ---------------------------------------------------------------------------
-- @media (max-width: 54rem) (lines 591-702)
-- ---------------------------------------------------------------------------

mediaMax54 :: Css
mediaMax54 =
    query Media.all [Media.maxWidth (rem 54)] $ do
        selectorFromText "body" ? do
            "width" -: "90vw"
            "grid-template-columns" -: "[left] auto [logo-right] 1fr [right]"
            "grid-template-rows" -: "[top] auto [nav-top] auto [content-top] auto [content-bottom] auto [bottom]"
        selectorFromText "body::before" ? do
            "display" -: "none"
        selectorFromText "header.logo" ? do
            "grid-row" -: "top / nav-top"
            "justify-self" -: "start"
        selectorFromText "header.blog-title" ? do
            "grid-row" -: "top / nav-top"
        selectorFromText ".blog-title-container" ? do
            "margin-left" -: "0.5rem"
        selectorFromText "body::after" ? do
            "grid-row" -: "top / nav-top"
        selectorFromText "nav" ? do
            "grid-row" -: "nav-top / content-top"
            "width" -: "auto"
        selectorFromText "main" ? do
            "margin-left" -: "0"
            "max-width" -: "calc(100vw - 19rem)"
        selectorFromText ".sidebar-container" ? do
            "flex-direction" -: "row"
            "align-items" -: "baseline"
            "margin-right" -: "0"
            "margin-top" -: "0"
            "margin-left" -: "0"
            "padding-top" -: "0.5rem"
            "padding-bottom" -: "0.5rem"
            "margin-bottom" -: "0rem"
            "border-bottom" -: "1px solid var(--border-color)"
            "border-top" -: "none"
        selectorFromText "#theme-toggle" ? do
            "margin-left" -: "auto"
            "margin-top" -: "0"
            "position" -: "relative"
            "top" -: "2px"
        selectorFromText "nav a" ? do
            "margin-left" -: "0"
            "margin-right" -: "1.5rem"
        selectorFromText "nav a:first-child" ? do
            "margin-left" -: "0"
        selectorFromText ".main-container" ? do
            "margin-top" -: "0"
            "padding-left" -: "0rem"
        selectorFromText "article" ? do
            "margin-left" -: "0"
        selectorFromText ".main-container > ul" ? do
            "margin-left" -: "0"
        selectorFromText ".teaser" ? do
            "margin-left" -: "0"
        selectorFromText ".image-large" ? do
            "width" -: "70%"
        selectorFromText ".image-medium" ? do
            "width" -: "50%"
        selectorFromText ".image-small" ? do
            "width" -: "35%"
        selectorFromText "footer" ? do
            "padding-top" -: "1rem"
            "margin-left" -: "0"
            "justify-content" -: "end"
        selectorFromText ".teaser::after" ? do
            "content" -: "\"\""
            "padding-bottom" -: "2rem"
            "position" -: "absolute"
            "left" -: "1.5rem"
            "right" -: "1.5rem"
            "height" -: "1px"
            "border-bottom" -: "1px solid var(--border-color)"

-- ---------------------------------------------------------------------------
-- @media (max-width: 32rem) (lines 705-768)
-- ---------------------------------------------------------------------------

mediaMax32 :: Css
mediaMax32 =
    query Media.all [Media.maxWidth (rem 32)] $ do
        selectorFromText "body" ? do
            "width" -: "95vw"
        selectorFromText ".sidebar-container" ? do
            "justify-content" -: "space-around"
        selectorFromText "nav a" ? do
            "margin-left" -: "0.5rem"
            "margin-right" -: "0.5rem"
        selectorFromText "main" ? do
            "max-width" -: "none"
        selectorFromText "article" ? do
            "margin-left" -: "0"
        selectorFromText ".main-container > ul" ? do
            "margin-left" -: "0"
        selectorFromText ".teaser" ? do
            "margin-left" -: "0"
        selectorFromText "h1" ? do
            "font-size" -: "2.4rem"
        selectorFromText "h2" ? do
            "font-size" -: "2.2rem"
        selectorFromText ".image-large" ? do
            "width" -: "90%"
        selectorFromText ".image-medium" ? do
            "width" -: "80%"
        selectorFromText ".image-small" ? do
            "width" -: "60%"
        selectorFromText ".teaser::after" ? do
            "left" -: "1.5rem"
            "right" -: "1.5rem"
        selectorFromText "footer" ? do
            "margin-left" -: "0"
            "justify-content" -: "end"
            "font-size" -: "1.2rem"
            "padding-left" -: "0"
            "padding-right" -: "0"

-- ---------------------------------------------------------------------------
-- @media (max-width: 22rem) — Very small phones (lines 771-830)
-- ---------------------------------------------------------------------------

mediaMax22 :: Css
mediaMax22 =
    query Media.all [Media.maxWidth (rem 22)] $ do
        selectorFromText "body" ? do
            "width" -: "98vw"
            "padding-left" -: "0.5rem"
            "padding-right" -: "0.5rem"
        selectorFromText ".blog-title a" ? do
            "padding-left" -: "0.5rem"
        selectorFromText "nav a" ? do
            "font-size" -: "1.5rem"
            "margin-left" -: "0.3rem"
            "margin-right" -: "0.3rem"
        selectorFromText "#theme-toggle" ? do
            "font-size" -: "1.2rem"
            "padding" -: "0.2rem 0.5rem"
        selectorFromText "h1" ? do
            "font-size" -: "2rem"
        selectorFromText "h2" ? do
            "font-size" -: "1.8rem"
        selectorFromText "h3" ? do
            "font-size" -: "1.6rem"
        selectorFromText ".article-body p, .article-body ol, .article-body ul" ? do
            "font-size" -: "1.3rem"
        selectorFromText "figcaption" ? do
            "margin-left" -: "1rem"
            "margin-right" -: "1rem"
        selectorFromText ".teaser::after" ? do
            "left" -: "1.5rem"
            "right" -: "1.5rem"
        selectorFromText ".image-large, .image-medium, .image-small" ? do
            "width" -: "100%"
        selectorFromText ".footer-logo" ? do
            "display" -: "none"

-- ---------------------------------------------------------------------------
-- Auth pages (lines 832-911) — rendered by the miso WASM auth app.
-- ---------------------------------------------------------------------------

authPages :: Css
authPages = do
    selectorFromText ".auth-form" ? do
        "max-width" -: "28rem"
        "margin" -: "2rem auto"
    selectorFromText ".auth-form label" ? do
        "display" -: "block"
        "font-size" -: "1.5rem"
        "margin-bottom" -: "0.3rem"
        "color" -: varColor "--dark-grey-color"
    selectorFromText ".auth-form input[type=\"text\"], .auth-form input[type=\"password\"], .auth-form input[type=\"email\"], .auth-form input[type=\"tel\"], .auth-form select" ? do
        "width" -: "100%"
        "padding" -: "0.5rem"
        "font-size" -: "1.5rem"
        "font-family" -: T.bodyTextFont T.fonts
        "border" -: "1px solid var(--border-color)"
        "border-radius" -: "4px"
        "background" -: varColor "--bg-color"
        "color" -: varColor "--text-color"
        "box-sizing" -: "border-box"
        "margin-bottom" -: "1rem"
    selectorFromText ".auth-form textarea" ? do
        "width" -: "100%"
        "padding" -: "0.5rem"
        "font-size" -: "1.5rem"
        "font-family" -: T.bodyTextFont T.fonts
        "border" -: "1px solid var(--border-color)"
        "border-radius" -: "4px"
        "background" -: varColor "--bg-color"
        "color" -: varColor "--text-color"
        "box-sizing" -: "border-box"
        "margin-bottom" -: "1rem"
        "resize" -: "vertical"
    selectorFromText ".auth-form button[type=\"submit\"]" ? do
        "font-family" -: T.headingFont T.fonts
        "font-size" -: "1.6rem"
        "text-transform" -: "uppercase"
        "padding" -: "0.5rem 1.5rem"
        "border" -: "1px solid var(--primary-color)"
        "border-radius" -: "3px"
        "background" -: "none"
        "color" -: varColor "--primary-color"
        "cursor" -: "pointer"
    selectorFromText ".auth-form button[type=\"submit\"]:hover" ? do
        "text-decoration" -: "underline"
    selectorFromText ".auth-form button[type=\"submit\"]:disabled" ? do
        "opacity" -: "0.5"
        "cursor" -: "wait"
    selectorFromText ".auth-error" ? do
        "color" -: T.authErrorColor
        "font-size" -: "1.4rem"
        "margin-bottom" -: "1rem"
    selectorFromText ".auth-success" ? do
        "color" -: T.authSuccessColor
        "font-size" -: "1.4rem"
        "margin-bottom" -: "1rem"
    selectorFromText ".auth-link" ? do
        "font-size" -: "1.4rem"
        "margin-top" -: "1rem"
    selectorFromText ".password-wrapper" ? do
        "position" -: "relative"
        "margin-bottom" -: "1rem"
    selectorFromText ".password-wrapper input" ? do
        "padding-right" -: "3rem"
        "margin-bottom" -: "0"
    selectorFromText ".password-toggle" ? do
        "position" -: "absolute"
        "right" -: "0.5rem"
        "top" -: "0"
        "height" -: "100%"
        "background" -: "none"
        "border" -: "none"
        "cursor" -: "pointer"
        "padding" -: "0"
        "color" -: varColor "--light-grey-color"
        "display" -: "flex"
        "align-items" -: "center"
    selectorFromText ".password-toggle:hover" ? do
        "color" -: varColor "--dark-grey-color"
    selectorFromText ".members-page" ? do
        "max-width" -: "40rem"
        "margin" -: "2rem auto"
    selectorFromText ".members-page p" ? do
        "font-size" -: "1.5rem"
        "font-family" -: T.bodyTextFont T.fonts
        "margin-bottom" -: "0.75rem"
        "color" -: varColor "--dark-grey-color"
    selectorFromText ".logout-link" ? do
        "font-size" -: "1.4rem"
