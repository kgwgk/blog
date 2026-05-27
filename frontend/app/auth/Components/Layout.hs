{-# LANGUAGE OverloadedStrings #-}

-- |
-- Module      : Components.Layout
-- Description : Site chrome (header, nav, main) wrapper for auth pages.
--
-- Mirrors the HTML structure that Hakyll renders for blog pages via
-- @static/templates/default.html@. The theme-toggle button slot is
-- supplied by the caller (typically 'Components.ThemeToggle').
module Components.Layout (layout) where

import Miso
import Miso.Html.Element
  ( a_
  , article_
  , div_
  , header_
  , img_
  , main_
  , nav_
  )
import Miso.Html.Property (alt_, class_, href_, id_, src_)

-- | Render the site chrome around a page-specific view, with a slot for
-- the theme toggle button.
layout
  :: View model action
  -- ^ theme-toggle slot
  -> View model action
  -- ^ page-specific content (rendered inside @\<article\>@)
  -> View model action
layout themeToggleView content =
  div_
    []
    [ header_
        [class_ "logo"]
        [ div_
            [class_ "logo-container"]
            [ a_
                [href_ "/"]
                [ img_
                    [ src_ "/images/kristofferson-transparent.png"
                    , alt_ ""
                    , class_ "logo-img"
                    ]
                ]
            ]
        ]
    , header_
        [class_ "blog-title"]
        [ div_
            [class_ "blog-title-container"]
            [a_ [href_ "/"] [text "hcentner's blog"]]
        ]
    , nav_
        []
        [ div_
            [class_ "sidebar-container"]
            [ a_ [href_ "/"] [text "Home"]
            , a_ [href_ "/about.html"] [text "About"]
            , a_ [href_ "/archive.html"] [text "Archive"]
            , themeToggleView
            ]
        ]
    , main_
        [id_ "main-content"]
        [ div_
            [class_ "main-container"]
            [article_ [] [content]]
        ]
    ]
