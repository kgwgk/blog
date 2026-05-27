{-# LANGUAGE DerivingStrategies #-}
{-# LANGUAGE OverloadedStrings #-}
{-# LANGUAGE RecordWildCards #-}

-- |
-- Module      : Pages.Login
-- Description : Login form. Calls 'Supabase.signInWithPassword', then POSTs
-- the resulting tokens to @\/auth\/callback@ so the worker can set HttpOnly
-- cookies. On success, navigates to the @redirect@ target (read from the
-- @auth-redirect@ meta tag).
module Pages.Login (app) where

import qualified Components.Layout as Layout
import qualified Components.PasswordInput as PI
import qualified Components.ThemeToggle as TT
import Data.Aeson (Value, object, withObject, (.:), (.=))
import qualified Data.Aeson as A
import qualified Data.Aeson.Types as AT
import Data.Maybe (fromMaybe)
import qualified FFI.Window as W
import Miso
import Miso.Html.Element
  ( a_
  , button_
  , div_
  , form_
  , h1_
  , input_
  , label_
  , p_
  )
import Miso.Html.Event (onInput, onSubmit)
import Miso.Html.Property
  ( class_
  , for_
  , href_
  , id_
  , name_
  , required_
  , type_
  , value_
  )
import Miso.Property (textProp)
import qualified Auth.Pure.Messages as Messages
import Data.Text (Text)
import qualified Supabase

------------------------------------------------------------------------------
-- Model & Action
------------------------------------------------------------------------------

data Model = Model
  { mTheme :: TT.Theme
  , mEmail :: MisoString
  , mPassword :: MisoString
  , mPasswordVisible :: Bool
  , mSubmitting :: Bool
  , mError :: Maybe MisoString
  , mRedirect :: MisoString
  }
  deriving stock (Eq)

data Action
  = SetEmail MisoString
  | SetPassword MisoString
  | TogglePassword
  | SetTheme TT.Theme
  | Submit
  | SignInDone Supabase.AuthResult
  | CallbackOk MisoString  -- redirect URL from worker
  | CallbackErr MisoString  -- error code from worker (invalid|pending)
  | NoOp
  deriving stock (Eq)

------------------------------------------------------------------------------
-- App
------------------------------------------------------------------------------

app :: IO (App Model Action)
app = do
  theme <- TT.initialise
  redirect <- fromMaybe "/" <$> W.readMeta "auth-redirect"
  initialErr <- W.readMeta "auth-error"
  let initial =
        Model
          { mTheme = theme
          , mEmail = ""
          , mPassword = ""
          , mPasswordVisible = False
          , mSubmitting = False
          , mError = fmap errorToMessage initialErr
          , mRedirect = redirect
          }
  pure $
    (component initial updateModel viewModel)
      { mountPoint = Just "auth-app"
      }

-- | Adapt the pure 'Messages.authErrorMessage' to the 'MisoString' boundary.
errorToMessage :: MisoString -> MisoString
errorToMessage = ms . Messages.authErrorMessage . fromMisoString

------------------------------------------------------------------------------
-- Update
------------------------------------------------------------------------------

updateModel :: Action -> Effect ROOT Model Action
updateModel (SetEmail e) = modify (\m -> m { mEmail = e })
updateModel (SetPassword p) = modify (\m -> m { mPassword = p })
updateModel TogglePassword = modify (\m -> m { mPasswordVisible = not (mPasswordVisible m) })
updateModel (SetTheme t) = do
  modify (\m -> m { mTheme = t })
  io_ (TT.toggle t >> pure ())
updateModel Submit = do
  m <- get
  if mEmail m == "" || mPassword m == ""
    then pure ()
    else do
      put m { mSubmitting = True, mError = Nothing }
      let email = mEmail m
          password = mPassword m
      withSink $ \sink -> do
        result <- Supabase.signInWithPassword email password
        sink (SignInDone result)
updateModel (SignInDone result)
  | not (Supabase.arOk result) =
      modify
        ( \m ->
            m
              { mSubmitting = False
              , mError = Just (fromMaybe "Sign in failed." (fmap ms (Supabase.arError result)))
              }
        )
  | otherwise = do
      m <- get
      case extractTokens (Supabase.arData result) of
        Nothing -> modify (\m' -> m' { mSubmitting = False, mError = Just "No session returned." })
        Just (access, refresh) -> do
          let body =
                object
                  [ "access_token" .= (fromMisoString access :: Text)
                  , "refresh_token" .= (fromMisoString refresh :: Text)
                  , "redirect" .= (fromMisoString (mRedirect m) :: Text)
                  ]
          withSink $ \sink -> do
            (status, parsed) <- W.fetchJson "/auth/callback" body
            case (status, parsed) of
              (200, Right v) ->
                case AT.parseMaybe (withObject "ok" (\o -> ms @String <$> o .: "redirect")) v of
                  Just r -> sink (CallbackOk r)
                  Nothing -> sink (CallbackErr "invalid")
              (_, Right v) ->
                case AT.parseMaybe (withObject "err" (\o -> ms @String <$> o .: "error")) v of
                  Just e -> sink (CallbackErr e)
                  Nothing -> sink (CallbackErr "invalid")
              _ -> sink (CallbackErr "invalid")
updateModel (CallbackOk url) =
  io_ (W.setLocation url)
updateModel (CallbackErr code) =
  modify
    (\m ->
       m
         { mSubmitting = False
         , mError = Just (errorToMessage code)
         })
updateModel NoOp = pure ()

------------------------------------------------------------------------------
-- Helpers
------------------------------------------------------------------------------

extractTokens :: Maybe Value -> Maybe (MisoString, MisoString)
extractTokens Nothing = Nothing
extractTokens (Just v) =
  AT.parseMaybe extract v
  where
    extract = withObject "data" $ \o -> do
      session <- o .: "session"
      withObject "session"
        (\s -> do
          a <- s .: "access_token"
          r <- s .: "refresh_token"
          pure (ms @String a, ms @String r))
        session

------------------------------------------------------------------------------
-- View
------------------------------------------------------------------------------

viewModel :: Model -> View Model Action
viewModel Model{..} =
  Layout.layout
    (TT.viewToggle mTheme SetTheme)
    ( div_ []
        [ h1_ [] [text "Login"]
        , case mError of
            Just err -> p_ [class_ "auth-error"] [text err]
            Nothing -> text ""
        , form_
            [class_ "auth-form", id_ "login-form", onSubmit Submit]
            [ label_ [for_ "email"] [text "Email"]
            , input_
                [ type_ "email"
                , id_ "email"
                , name_ "email"
                , required_ True
                , textProp "autocomplete" "email"
                , value_ mEmail
                , onInput SetEmail
                ]
            , label_ [for_ "password"] [text "Password"]
            , PI.passwordInput "password" "current-password" mPassword mPasswordVisible SetPassword TogglePassword
            , button_
                [type_ "submit"]
                [text (if mSubmitting then "Signing in..." else "Login")]
            ]
        , p_ [class_ "auth-link"] [a_ [href_ "/forgot-password"] [text "Forgot password?"]]
        , p_ [class_ "auth-link"] [a_ [href_ "/register"] [text "Don't have an account? Register"]]
        ]
    )
