{-# LANGUAGE DerivingStrategies #-}
{-# LANGUAGE OverloadedStrings #-}
{-# LANGUAGE RecordWildCards #-}

-- |
-- Module      : Pages.Forgot
-- Description : Forgot-password form. Calls 'Supabase.resetPasswordForEmail';
-- the email gets a magic link that lands the user on @\/reset-password\#...@.
module Pages.Forgot (app) where

import qualified Components.Layout as Layout
import qualified Components.ThemeToggle as TT
import Data.Maybe (fromMaybe)
import qualified FFI.Window as W
import Miso
import Miso.Html.Element (a_, button_, div_, form_, h1_, input_, label_, p_)
import Miso.Html.Event (onInput, onSubmit)
import Miso.Html.Property (class_, for_, href_, id_, name_, required_, type_, value_)
import Miso.Property (textProp)
import Miso.String (MisoString, ms)
import qualified Supabase

data Model = Model
  { mTheme :: TT.Theme
  , mEmail :: MisoString
  , mSubmitting :: Bool
  , mSent :: Bool
  , mError :: Maybe MisoString
  }
  deriving stock (Eq)

data Action
  = SetEmail MisoString
  | SetTheme TT.Theme
  | Submit
  | ResetDone Supabase.AuthResult
  deriving stock (Eq)

app :: IO (App Model Action)
app = do
  theme <- TT.initialise
  let initial = Model theme "" False False Nothing
  pure $
    (component initial updateModel viewModel)
      { mountPoint = Just "auth-app"
      }

updateModel :: Action -> Effect ROOT Model Action
updateModel (SetEmail v) = modify (\m -> m { mEmail = v })
updateModel (SetTheme t) = do
  modify (\m -> m { mTheme = t })
  io_ (TT.toggle t >> pure ())
updateModel Submit = do
  m <- get
  if mEmail m == ""
    then pure ()
    else do
      put m { mSubmitting = True, mError = Nothing }
      let email = mEmail m
      withSink $ \sink -> do
        origin <- W.getOrigin
        let redirectTo = origin <> "/reset-password"
        result <- Supabase.resetPasswordForEmail email (Just redirectTo)
        sink (ResetDone result)
updateModel (ResetDone result)
  | Supabase.arOk result = modify (\m -> m { mSubmitting = False, mSent = True })
  | otherwise =
      modify
        (\m ->
           m
             { mSubmitting = False
             , mError = Just (fromMaybe "Failed to send reset email." (fmap ms (Supabase.arError result)))
             })

viewModel :: Model -> View Model Action
viewModel Model{..} =
  Layout.layout
    (TT.viewToggle mTheme SetTheme)
    ( if mSent
        then sentView
        else formView
    )
  where
    sentView =
      div_
        []
        [ h1_ [] [text "Forgot Password"]
        , p_ [class_ "auth-success"] [text "If an account with that email exists, a password reset email has been sent."]
        , p_ [class_ "auth-link"] [a_ [href_ "/login"] [text "Back to login"]]
        ]
    formView =
      div_
        []
        [ h1_ [] [text "Forgot Password"]
        , case mError of
            Just err -> p_ [class_ "auth-error"] [text err]
            Nothing -> text ""
        , form_
            [class_ "auth-form", id_ "forgot-form", onSubmit Submit]
            [ label_ [for_ "email"] [text "Email"]
            , input_
                [ type_ "email", id_ "email", name_ "email", required_ True
                , textProp "autocomplete" "email"
                , value_ mEmail, onInput SetEmail
                ]
            , button_
                [type_ "submit"]
                [text (if mSubmitting then "Sending..." else "Send Reset Email")]
            ]
        , p_ [class_ "auth-link"] [a_ [href_ "/login"] [text "Back to login"]]
        ]
