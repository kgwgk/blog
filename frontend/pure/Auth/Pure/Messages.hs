{-# LANGUAGE OverloadedStrings #-}

-- |
-- Module      : Auth.Pure.Messages
-- Description : Map auth error codes to user-facing messages. FFI-free.
module Auth.Pure.Messages (authErrorMessage) where

import Data.Text (Text)

-- | Translate an error code (from the worker's @\/auth\/callback@ response,
-- or a @?error=@ query param) into a message shown on the login form.
--
-- The only distinguished code is @"pending"@ (account awaiting approval);
-- everything else collapses to the generic invalid-credentials message so
-- we never leak whether an email exists.
authErrorMessage :: Text -> Text
authErrorMessage "pending" = "Your account is awaiting admin approval."
authErrorMessage _ = "Invalid email or password."
