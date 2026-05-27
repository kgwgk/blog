{-# LANGUAGE DerivingStrategies #-}
{-# LANGUAGE OverloadedStrings #-}
{-# LANGUAGE RecordWildCards #-}

-- |
-- Module      : Pages.Reset
-- Description : Password-reset form. Reached via the magic link from
-- 'Pages.Forgot'. Parses the @access_token@ + @refresh_token@ from
-- @location.hash@, calls 'Supabase.setSession' to authenticate, then
-- 'Supabase.updateUser' to set the new password.
module Pages.Reset (app) where

import qualified Components.Layout as Layout
import qualified Components.PasswordInput as PI
import qualified Components.ThemeToggle as TT
import qualified Auth.Pure.Hash as Hash
import Data.Aeson (object, (.=))
import Data.Maybe (fromMaybe)
import Data.Text (Text)
import qualified FFI.Window as W
import Miso
import Miso.Html.Element (a_, button_, div_, form_, h1_, label_, p_)
import Miso.Html.Event (onSubmit)
import Miso.Html.Property (class_, for_, href_, id_)
import Miso.String (MisoString, fromMisoString, ms, toMisoString)
import qualified Supabase

data ResetPhase = Loading | Ready | Invalid | Done
  deriving stock (Eq)

data Model = Model
  { mTheme :: TT.Theme
  , mPhase :: ResetPhase
  , mPassword :: MisoString
  , mPasswordVisible :: Bool
  , mConfirm :: MisoString
  , mConfirmVisible :: Bool
  , mSubmitting :: Bool
  , mError :: Maybe MisoString
  }
  deriving stock (Eq)

data Action
  = SetTheme TT.Theme
  | SetPassword MisoString
  | TogglePassword
  | SetConfirm MisoString
  | ToggleConfirm
  | Submit
  | UpdateDone Supabase.AuthResult
  deriving stock (Eq)

-- | Build the app. Hash parsing + setSession happen synchronously in IO
-- before mount so the initial 'mPhase' is already 'Ready' or 'Invalid'.
app :: IO (App Model Action)
app = do
  theme <- TT.initialise
  initialPhase <- resolveHash
  let initial = Model theme initialPhase "" False "" False False Nothing
  pure $
    (component initial updateModel viewModel)
      { mountPoint = Just "auth-app"
      }

-- | Parse @location.hash@; if it looks like a recovery link, exchange the
-- tokens via 'Supabase.setSession' and report 'Ready' or 'Invalid'.
resolveHash :: IO ResetPhase
resolveHash = do
  hash <- W.getHash
  let params = Hash.parseHashParams (fromMisoString hash)
      access = lookup "access_token" params
      refresh = lookup "refresh_token" params
      kind = lookup "type" params
  case (access, refresh, kind) of
    (Just a, Just r, Just "recovery") -> do
      result <- Supabase.setSession (toMisoString a) (toMisoString r)
      pure (if Supabase.arOk result then Ready else Invalid)
    _ -> pure Invalid

updateModel :: Action -> Effect ROOT Model Action
updateModel (SetTheme t) = do
  modify (\m -> m { mTheme = t })
  io_ (TT.toggle t >> pure ())
updateModel (SetPassword v) = modify (\m -> m { mPassword = v })
updateModel TogglePassword = modify (\m -> m { mPasswordVisible = not (mPasswordVisible m) })
updateModel (SetConfirm v) = modify (\m -> m { mConfirm = v })
updateModel ToggleConfirm = modify (\m -> m { mConfirmVisible = not (mConfirmVisible m) })
updateModel Submit = do
  m <- get
  if mPassword m /= mConfirm m
    then modify (\m' -> m' { mError = Just "Passwords do not match." })
    else if mPassword m == ""
      then pure ()
      else do
        put m { mSubmitting = True, mError = Nothing }
        let payload = object ["password" .= (fromMisoString (mPassword m) :: Text)]
        withSink $ \sink -> do
          result <- Supabase.updateUser payload
          sink (UpdateDone result)
updateModel (UpdateDone result)
  | Supabase.arOk result = modify (\m -> m { mPhase = Done, mSubmitting = False })
  | otherwise =
      modify
        (\m ->
           m
             { mSubmitting = False
             , mError = Just (fromMaybe "Update failed." (fmap ms (Supabase.arError result)))
             })

viewModel :: Model -> View Model Action
viewModel Model{..} =
  Layout.layout
    (TT.viewToggle mTheme SetTheme)
    ( case mPhase of
        Loading -> div_ [] [h1_ [] [text "Reset Password"], p_ [] [text "Loading..."]]
        Invalid ->
          div_
            []
            [ h1_ [] [text "Reset Password"]
            , p_ [class_ "auth-error"] [text "This reset link is invalid or has expired."]
            , p_ [class_ "auth-link"] [a_ [href_ "/forgot-password"] [text "Request a new reset link"]]
            ]
        Done ->
          div_
            []
            [ h1_ [] [text "Password Reset"]
            , p_ [class_ "auth-success"] [text "Your password has been reset successfully."]
            , p_ [class_ "auth-link"] [a_ [href_ "/login"] [text "Go to login"]]
            ]
        Ready ->
          div_
            []
            [ h1_ [] [text "Reset Password"]
            , case mError of
                Just err -> p_ [class_ "auth-error"] [text err]
                Nothing -> text ""
            , form_
                [class_ "auth-form", id_ "reset-form", onSubmit Submit]
                [ label_ [for_ "password"] [text "New Password"]
                , PI.passwordInput "password" "new-password" mPassword mPasswordVisible SetPassword TogglePassword
                , label_ [for_ "confirmPassword"] [text "Confirm New Password"]
                , PI.passwordInput "confirmPassword" "new-password" mConfirm mConfirmVisible SetConfirm ToggleConfirm
                , button_
                    []
                    [text (if mSubmitting then "Resetting..." else "Reset Password")]
                ]
            ]
    )
