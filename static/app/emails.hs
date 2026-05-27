{-# LANGUAGE NoImplicitPrelude #-}

{- | Prints the Supabase auth email-template payload (the ten Management API
@mailer_*@ keys) as JSON on stdout. The CI sync workflow PATCHes this to the
Supabase Management API.
-}
module Main (main) where

import Data.Aeson qualified as Aeson
import Data.ByteString.Lazy.Char8 qualified as LBS8
import Design.Email (emailPayload)
import Relude

main :: IO ()
main = LBS8.putStrLn (Aeson.encode emailPayload)
