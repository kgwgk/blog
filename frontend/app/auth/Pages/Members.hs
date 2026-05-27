{-# LANGUAGE DerivingStrategies #-}
{-# LANGUAGE OverloadedStrings #-}
{-# LANGUAGE RecordWildCards #-}

-- |
-- Module      : Pages.Members
-- Description : Members landing page. No Supabase interaction — the email
-- is rendered from the @member-email@ meta tag that the worker emits.
module Pages.Members (app) where

import qualified Components.Layout as Layout
import qualified Components.ThemeToggle as TT
import Data.Maybe (fromMaybe)
import qualified FFI.Window as W
import Miso
import Miso.Html.Element (a_, div_, h1_, p_)
import Miso.Html.Property (class_, href_)
import Miso.String (MisoString)

data Model = Model
  { mTheme :: TT.Theme
  , mEmail :: MisoString
  }
  deriving stock (Eq)

data Action = SetTheme TT.Theme
  deriving stock (Eq)

app :: IO (App Model Action)
app = do
  theme <- TT.initialise
  email <- fromMaybe "" <$> W.readMeta "member-email"
  let initial = Model theme email
  pure $
    (component initial updateModel viewModel)
      { mountPoint = Just "auth-app"
      }

updateModel :: Action -> Effect ROOT Model Action
updateModel (SetTheme t) = do
  modify (\m -> m { mTheme = t })
  io_ (TT.toggle t >> pure ())

viewModel :: Model -> View Model Action
viewModel Model{..} =
  Layout.layout
    (TT.viewToggle mTheme SetTheme)
    ( div_
        [class_ "members-page"]
        [ h1_ [] [text "Members"]
        , p_ [] [text ("Welcome, " <> mEmail <> "!")]
        , p_ [class_ "logout-link"] [a_ [href_ "/auth/logout"] [text "Logout"]]
        ]
    )
