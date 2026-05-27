{-# LANGUAGE DeriveGeneric #-}
{-# LANGUAGE DerivingStrategies #-}
{-# LANGUAGE OverloadedStrings #-}

-- |
-- Module      : Supabase
-- Description : Native GHC WASM FFI bindings for @\@supabase/supabase-js@.
--
-- Each Haskell entry point marshals its arguments to a JSON string, hands
-- it to the JS shim 'globalThis.supabaseAuthCall' (defined in
-- @frontend\/js\/supabase-ffi.js@), and decodes the uniform
-- @{ok, data, error}@ response.
--
-- == FFI shape
--
-- GHC 9.12's WASM backend auto-awaits Promises returned from @safe@
-- imports, so an async JS function can be wrapped as
--
-- > foreign import javascript safe "..." :: ... -> IO JSVal
--
-- and the resulting IO action blocks until the Promise resolves.
--
-- == @JSString@ caveat
--
-- GHC 9.12 generates broken C stubs for foreign imports that mention
-- 'JSString' in their type signature (the codegen emits calls to
-- @rts_mkJSString@ \/ @rts_getJSString@ which the RTS does not provide;
-- only @rts_mkJSVal@ \/ @rts_getJSVal@ exist). This affects both
-- arguments and return types, in both @safe@ and @unsafe@ imports.
--
-- Workaround: keep every foreign import boundary at 'JSVal', and
-- convert between 'JSString' and 'JSVal' purely in Haskell by pattern
-- matching on the @JSString@ newtype constructor. This is the same
-- pattern miso uses in its WASM backend.
module Supabase
  ( AuthResult (..)
  , signInWithPassword
  , signUp
  , resetPasswordForEmail
  , setSession
  , updateUser
  ) where

import Data.Aeson
  ( FromJSON (..)
  , Value
  , decode
  , encode
  , object
  , withObject
  , (.:)
  , (.:?)
  , (.=)
  )
import qualified Data.ByteString.Lazy.Char8 as BSL
import Data.Text (Text)
import qualified Data.Text as T
import GHC.Wasm.Prim (JSString (..), JSVal, fromJSString, toJSString)
import Miso.String (MisoString, fromMisoString)

------------------------------------------------------------------------------
-- Foreign declarations
------------------------------------------------------------------------------

-- | Invokes the JS shim defined in @frontend/js/supabase-ffi.js@.
--
-- The shim's signature is
--
-- > async function supabaseAuthCall(method: string, argsJson: string): Promise<string>
--
-- where the returned string is JSON-encoded @{ok, data, error}@. Because
-- @safe@ imports auto-await Promises in GHC 9.12 WASM, this IO action
-- blocks until the SDK call resolves.
--
-- All argument and return types are 'JSVal' to avoid the JSString
-- codegen bug; the 'jsStringToVal' / 'valToJSString' helpers below
-- bridge 'JSString' purely in Haskell.
foreign import javascript safe "globalThis.supabaseAuthCall($1, $2)"
  js_supabaseAuthCall :: JSVal -> JSVal -> IO JSVal

------------------------------------------------------------------------------
-- Public types
------------------------------------------------------------------------------

-- | Uniform success\/failure shape returned by every auth call.
--
-- The JS shim normalises the supabase-js result into this shape, so the
-- Haskell side never has to look at the SDK's per-method response types.
data AuthResult = AuthResult
  { arOk :: !Bool
  -- ^ True iff the SDK call resolved without an @error@ field.
  , arData :: !(Maybe Value)
  -- ^ The SDK's @data@ field on success (e.g. session + user).
  , arError :: !(Maybe Text)
  -- ^ The SDK's @error.message@ on failure.
  }
  deriving stock (Show, Eq)

instance FromJSON AuthResult where
  parseJSON = withObject "AuthResult" $ \o ->
    AuthResult
      <$> o .: "ok"
      <*> o .:? "data"
      <*> o .:? "error"

------------------------------------------------------------------------------
-- JSString <-> JSVal bridging (pure)
------------------------------------------------------------------------------

-- | Unwrap the 'JSString' newtype to its underlying 'JSVal'. Safe
-- because 'JSString' is defined as @newtype JSString = JSString JSVal@.
jsStringToVal :: JSString -> JSVal
jsStringToVal (JSString v) = v

-- | Wrap a 'JSVal' as a 'JSString'. The caller must know the value is
-- actually a JS string at runtime (we use this only on values returned
-- by the shim, which always resolves with a JSON-encoded string).
valToJSString :: JSVal -> JSString
valToJSString = JSString

------------------------------------------------------------------------------
-- Internal dispatch
------------------------------------------------------------------------------

-- | Marshal @(method, args)@ across the FFI and decode the shim's
-- response. Decoding failures are surfaced as an 'AuthResult' with
-- @arOk = False@ and a diagnostic in 'arError' so callers never see
-- exceptions from a malformed shim response.
callAuth :: Text -> Value -> IO AuthResult
callAuth method args = do
  let methodVal = jsStringToVal (toJSString (T.unpack method))
      argsVal = jsStringToVal (toJSString (BSL.unpack (encode args)))
  resVal <- js_supabaseAuthCall methodVal argsVal
  let resStr = fromJSString (valToJSString resVal)
  case decode (BSL.pack resStr) of
    Just r -> pure r
    Nothing ->
      pure
        ( AuthResult
            False
            Nothing
            (Just (T.pack ("FFI decode failed: " <> take 200 resStr)))
        )

------------------------------------------------------------------------------
-- Public API
------------------------------------------------------------------------------

-- | @supabase.auth.signInWithPassword({email, password})@.
signInWithPassword :: MisoString -> MisoString -> IO AuthResult
signInWithPassword email password =
  callAuth "signInWithPassword" $
    object
      [ "email" .= asText email
      , "password" .= asText password
      ]

-- | @supabase.auth.signUp({email, password, options: {data: metadata}?})@.
--
-- The optional @metadata@ becomes the @user_metadata@ on the new user
-- via supabase-js's @options.data@ field.
signUp :: MisoString -> MisoString -> Maybe Value -> IO AuthResult
signUp email password metadata =
  callAuth "signUp" $
    object $
      [ "email" .= asText email
      , "password" .= asText password
      ]
        ++ case metadata of
          Nothing -> []
          Just md -> ["options" .= object ["data" .= md]]

-- | @supabase.auth.resetPasswordForEmail(email, { redirectTo? })@.
--
-- The JS shim special-cases this method to expand the @options@ field
-- into the SDK's second positional arg.
resetPasswordForEmail :: MisoString -> Maybe MisoString -> IO AuthResult
resetPasswordForEmail email mRedirectTo =
  let opts = case mRedirectTo of
        Nothing -> object []
        Just r -> object ["redirectTo" .= asText r]
   in callAuth "resetPasswordForEmail" $
        object
          [ "email" .= asText email
          , "options" .= opts
          ]

-- | @supabase.auth.setSession({access_token, refresh_token})@.
setSession :: MisoString -> MisoString -> IO AuthResult
setSession accessToken refreshToken =
  callAuth "setSession" $
    object
      [ "access_token" .= asText accessToken
      , "refresh_token" .= asText refreshToken
      ]

-- | @supabase.auth.updateUser(payload)@ — e.g. @{password: \"...\"}@.
--
-- The payload is forwarded verbatim, so callers control which user
-- fields are updated.
updateUser :: Value -> IO AuthResult
updateUser payload =
  callAuth "updateUser" payload

-- | Convert a 'MisoString' to a 'Text' for use in Aeson encoding.
asText :: MisoString -> Text
asText = fromMisoString
