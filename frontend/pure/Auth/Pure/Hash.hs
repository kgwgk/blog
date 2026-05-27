{-# LANGUAGE OverloadedStrings #-}

-- |
-- Module      : Auth.Pure.Hash
-- Description : Parse a URL fragment (@location.hash@) into key/value pairs.
--
-- Used by the password-reset flow, where Supabase returns the recovery
-- @access_token@ / @refresh_token@ / @type@ in the URL fragment. FFI-free;
-- depends only on text, so it is unit/property testable on native GHC.
module Auth.Pure.Hash (parseHashParams) where

import Data.Text (Text)
import qualified Data.Text as T

-- | Parse an @&@-separated, @=@-delimited fragment body into pairs.
--
-- * The fragment must already have its leading @#@ stripped.
-- * Keys with no @=@ map to an empty value.
-- * A value may itself contain @=@ (only the first @=@ splits), so e.g.
--   @"a=b=c"@ yields @("a", "b=c")@.
-- * Empty segments (e.g. from a trailing @&@) are dropped.
parseHashParams :: Text -> [(Text, Text)]
parseHashParams h =
  [ (k, T.drop 1 rest)
  | pair <- T.splitOn "&" h
  , not (T.null pair)
  , let (k, rest) = T.breakOn "=" pair
  , not (T.null k)
  ]
