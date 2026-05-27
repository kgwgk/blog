{-# LANGUAGE NoImplicitPrelude #-}

module Main (main) where

import Data.Aeson qualified as Aeson
import Data.Aeson.Key qualified as Key
import Data.Aeson.KeyMap qualified as KM
import Data.Text qualified as T
import Design.Email
import Relude
import Test.Tasty
import Test.Tasty.HUnit

main :: IO ()
main =
  defaultMain
    $ testGroup
      "email"
      [ testCase "every template has ConfirmationURL placeholder"
          $ forM_ allTemplates
          $ \t ->
            assertBool (label t) (T.isInfixOf "{{ .ConfirmationURL }}" (templateHtml t))
      , testCase "change-email template has NewEmail placeholder"
          $ assertBool "NewEmail" (T.isInfixOf "{{ .NewEmail }}" (templateHtml ChangeEmail))
      , testCase "no template uses CSS variables"
          $ forM_ allTemplates
          $ \t ->
            assertBool (label t) (not (T.isInfixOf "var(--" (templateHtml t)))
      , testCase "payload has exactly the ten expected keys"
          $ case emailPayload of
            Aeson.Object o -> sort (map Key.toText (KM.keys o)) @?= sort expectedKeys
            _ -> assertFailure "payload is not an object"
      ]

-- | A human-readable assertion label for a template.
label :: EmailTemplate -> String
label = show

expectedKeys :: [Text]
expectedKeys =
  [ "mailer_subjects_confirmation"
  , "mailer_templates_confirmation_content"
  , "mailer_subjects_invite"
  , "mailer_templates_invite_content"
  , "mailer_subjects_magic_link"
  , "mailer_templates_magic_link_content"
  , "mailer_subjects_email_change"
  , "mailer_templates_email_change_content"
  , "mailer_subjects_recovery"
  , "mailer_templates_recovery_content"
  ]
