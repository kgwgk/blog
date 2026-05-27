{-# LANGUAGE DerivingStrategies #-}
{-# LANGUAGE OverloadedStrings #-}
{-# LANGUAGE RecordWildCards #-}

-- |
-- Module      : Pages.Register
-- Description : Registration form. Calls 'Supabase.signUp' with @phone@,
-- @signalId@, and @knowFrom@ in @user_metadata@. On success, shows a pending
-- approval message; admin promotes the user via the Supabase dashboard.
module Pages.Register (app) where

import qualified Components.Layout as Layout
import qualified Components.PasswordInput as PI
import qualified Components.ThemeToggle as TT
import Data.Aeson (object, (.=))
import Data.Maybe (fromMaybe)
import Data.Text (Text)
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
  , textarea_
  )
import Miso.Html.Event (onInput, onSubmit)
import Miso.Html.Property
  ( class_
  , for_
  , href_
  , id_
  , name_
  , required_
  , rows_
  , type_
  , value_
  )
import Miso.Property (textProp)
import Miso.String (MisoString, fromMisoString, ms)
import qualified Supabase

data Model = Model
  { mTheme :: TT.Theme
  , mEmail :: MisoString
  , mPassword :: MisoString
  , mPasswordVisible :: Bool
  , mPhone :: MisoString
  , mSignalId :: MisoString
  , mKnowFrom :: MisoString
  , mSubmitting :: Bool
  , mError :: Maybe MisoString
  , mSuccess :: Bool
  }
  deriving stock (Eq)

data Action
  = SetEmail MisoString
  | SetPassword MisoString
  | TogglePassword
  | SetPhone MisoString
  | SetSignalId MisoString
  | SetKnowFrom MisoString
  | SetTheme TT.Theme
  | Submit
  | SignUpDone Supabase.AuthResult
  deriving stock (Eq)

app :: IO (App Model Action)
app = do
  theme <- TT.initialise
  let initial =
        Model theme "" "" False "" "" "" False Nothing False
  pure $
    (component initial updateModel viewModel)
      { mountPoint = Just "auth-app"
      }

updateModel :: Action -> Effect ROOT Model Action
updateModel (SetEmail v) = modify (\m -> m { mEmail = v })
updateModel (SetPassword v) = modify (\m -> m { mPassword = v })
updateModel TogglePassword = modify (\m -> m { mPasswordVisible = not (mPasswordVisible m) })
updateModel (SetPhone v) = modify (\m -> m { mPhone = v })
updateModel (SetSignalId v) = modify (\m -> m { mSignalId = v })
updateModel (SetKnowFrom v) = modify (\m -> m { mKnowFrom = v })
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
          metadata =
            object
              [ "phone" .= nullIfBlank (mPhone m)
              , "signalId" .= nullIfBlank (mSignalId m)
              , "knowFrom" .= nullIfBlank (mKnowFrom m)
              ]
      withSink $ \sink -> do
        result <- Supabase.signUp email password (Just metadata)
        sink (SignUpDone result)
updateModel (SignUpDone result)
  | Supabase.arOk result =
      modify (\m -> m { mSubmitting = False, mSuccess = True })
  | otherwise =
      modify
        (\m ->
           m
             { mSubmitting = False
             , mError = Just (fromMaybe "Registration failed." (fmap ms (Supabase.arError result)))
             })

nullIfBlank :: MisoString -> Maybe Text
nullIfBlank s
  | s == "" = Nothing
  | otherwise = Just (fromMisoString s)

viewModel :: Model -> View Model Action
viewModel Model{..} =
  Layout.layout
    (TT.viewToggle mTheme SetTheme)
    ( if mSuccess
        then successView
        else formView
    )
  where
    successView =
      div_
        []
        [ h1_ [] [text "Register"]
        , p_ [class_ "auth-success"] [text "Registration submitted! Your account is pending admin approval."]
        , p_ [class_ "auth-link"] [a_ [href_ "/login"] [text "Already have an account? Login"]]
        ]
    formView =
      div_
        []
        [ h1_ [] [text "Register"]
        , case mError of
            Just err -> p_ [class_ "auth-error"] [text err]
            Nothing -> text ""
        , form_
            [class_ "auth-form", id_ "register-form", onSubmit Submit]
            [ label_ [for_ "email"] [text "Email"]
            , input_
                [ type_ "email", id_ "email", name_ "email", required_ True
                , textProp "autocomplete" "email"
                , value_ mEmail, onInput SetEmail
                ]
            , label_ [for_ "password"] [text "Password"]
            , PI.passwordInput "password" "new-password" mPassword mPasswordVisible SetPassword TogglePassword
            , label_ [for_ "phone"] [text "Phone (optional)"]
            , input_
                [ type_ "tel", id_ "phone", name_ "phone"
                , textProp "autocomplete" "tel"
                , value_ mPhone, onInput SetPhone
                ]
            , label_ [for_ "signalId"] [text "Signal ID (optional)"]
            , input_
                [ type_ "text", id_ "signalId", name_ "signalId"
                , value_ mSignalId, onInput SetSignalId
                ]
            , label_ [for_ "knowFrom"] [text "How do you know Harry?"]
            , textarea_
                [ id_ "knowFrom", name_ "knowFrom", required_ True
                , rows_ "3", value_ mKnowFrom, onInput SetKnowFrom
                ]
            , button_
                [type_ "submit"]
                [text (if mSubmitting then "Registering..." else "Register")]
            ]
        , p_ [class_ "auth-link"] [a_ [href_ "/login"] [text "Already have an account? Login"]]
        ]
