{-# LANGUAGE OverloadedStrings #-}

-- |
-- Module      : FFI.Window
-- Description : Native GHC WASM FFI for window/location/localStorage/document.
--
-- Wraps @window.*@, @localStorage@, and a few @document@ mutations using
-- native GHC 9.12 WASM FFI (@foreign import javascript@).
--
-- HTTP requests are NOT here — use @"Miso.Fetch"@'s 'Miso.Fetch.postJSON' /
-- 'Miso.Fetch.postJSON\'' instead, which integrate with miso's effect system.
--
-- == @JSString@ caveat
--
-- GHC 9.12 generates broken C stubs for foreign imports that mention
-- 'JSString' in their type signature. All FFI boundaries use 'JSVal'
-- only; conversion is done purely in Haskell by pattern-matching on the
-- @JSString@ newtype constructor (which is what 'MisoString' is on the
-- WASM target).
module FFI.Window
  ( -- * Location
    getPathname
  , getOrigin
  , getHash
  , setLocation

    -- * localStorage
  , localStorageGet
  , localStorageSet

    -- * Media queries
  , prefersDark

    -- * Document theme attribute
  , setDataTheme
  , removeDataTheme

    -- * HTTP
  , fetchJson

    -- * DOM lookup
  , readMeta
  ) where

import Data.Aeson (Value, eitherDecode, encode)
import qualified Data.ByteString.Lazy.Char8 as BSL
import GHC.Wasm.Prim (JSVal)
import Miso.String (MisoString)
import qualified Miso.String as MS

------------------------------------------------------------------------------
-- JSVal <-> MisoString bridging (pure)
--
-- On the WASM backend, MisoString is a newtype around JSString which is itself
-- a newtype around JSVal, so the conversion is just unwrapping/wrapping.
-- We use Miso.String's smart constructors to keep this backend-agnostic.
------------------------------------------------------------------------------

msToVal :: MisoString -> JSVal
msToVal s = case MS.toJSString (MS.unpack s) of MS.JSString v -> v

valToMs :: JSVal -> MisoString
valToMs v = MS.pack (MS.fromJSString (MS.JSString v))

------------------------------------------------------------------------------
-- Foreign imports
------------------------------------------------------------------------------

foreign import javascript safe "window.location.pathname"
  js_pathname :: IO JSVal

foreign import javascript safe "window.location.origin"
  js_origin :: IO JSVal

-- Returns the hash without the leading '#', or empty string if none.
foreign import javascript safe
  "(function(){ var h = window.location.hash; return h.startsWith('#') ? h.slice(1) : h; })()"
  js_hash :: IO JSVal

foreign import javascript safe "window.location.assign($1)"
  js_assign :: JSVal -> IO ()

foreign import javascript safe "localStorage.getItem($1)"
  js_localStorageGet :: JSVal -> IO JSVal

foreign import javascript safe "localStorage.setItem($1, $2)"
  js_localStorageSet :: JSVal -> JSVal -> IO ()

foreign import javascript safe
  "window.matchMedia('(prefers-color-scheme: dark)').matches"
  js_prefersDark :: IO JSVal

foreign import javascript unsafe
  "document.documentElement.setAttribute('data-theme', $1)"
  js_setDataTheme :: JSVal -> IO ()

foreign import javascript unsafe
  "document.documentElement.removeAttribute('data-theme')"
  js_removeDataTheme :: IO ()

foreign import javascript safe
  "(function(){ var m = document.querySelector('meta[name=\"' + $1 + '\"]'); return m ? m.content : null; })()"
  js_readMeta :: JSVal -> IO JSVal

-- Performs a POST fetch with a JSON body and resolves to {status, text}.
foreign import javascript safe
  "fetch($1, {method:'POST', headers:{'Content-Type':'application/json'}, body:$2}).then(async r => ({status: r.status, text: await r.text()}))"
  js_fetchPost :: JSVal -> JSVal -> IO JSVal

foreign import javascript unsafe "$1.status"
  js_respStatus :: JSVal -> IO Int

foreign import javascript unsafe "$1.text"
  js_respText :: JSVal -> IO JSVal

------------------------------------------------------------------------------
-- Utility imports
------------------------------------------------------------------------------

foreign import javascript unsafe "$1 === null || $1 === undefined"
  js_isNull :: JSVal -> IO Bool

foreign import javascript unsafe "Boolean($1)"
  js_toBool :: JSVal -> IO Bool

------------------------------------------------------------------------------
-- Public API
------------------------------------------------------------------------------

-- | @window.location.pathname@
getPathname :: IO MisoString
getPathname = valToMs <$> js_pathname

-- | @window.location.origin@
getOrigin :: IO MisoString
getOrigin = valToMs <$> js_origin

-- | @window.location.hash@ with the leading @\'#\'@ stripped. Empty if no
-- fragment.
getHash :: IO MisoString
getHash = valToMs <$> js_hash

-- | @window.location.assign(url)@ — navigate.
setLocation :: MisoString -> IO ()
setLocation url = js_assign (msToVal url)

-- | @localStorage.getItem(key)@, returning 'Nothing' on a null/undefined value.
localStorageGet :: MisoString -> IO (Maybe MisoString)
localStorageGet key = do
  v <- js_localStorageGet (msToVal key)
  nullish <- js_isNull v
  if nullish
    then pure Nothing
    else pure (Just (valToMs v))

-- | @localStorage.setItem(key, value)@.
localStorageSet :: MisoString -> MisoString -> IO ()
localStorageSet key val = js_localStorageSet (msToVal key) (msToVal val)

-- | @window.matchMedia('(prefers-color-scheme: dark)').matches@
prefersDark :: IO Bool
prefersDark = js_prefersDark >>= js_toBool

-- | @document.documentElement.setAttribute('data-theme', t)@.
setDataTheme :: MisoString -> IO ()
setDataTheme t = js_setDataTheme (msToVal t)

-- | @document.documentElement.removeAttribute('data-theme')@.
removeDataTheme :: IO ()
removeDataTheme = js_removeDataTheme

-- | @document.querySelector(\'meta[name=\"...\"]\')?\.content@.
-- Returns 'Nothing' when no matching element exists.
readMeta :: MisoString -> IO (Maybe MisoString)
readMeta name = do
  v <- js_readMeta (msToVal name)
  nullish <- js_isNull v
  if nullish
    then pure Nothing
    else pure (Just (valToMs v))

-- | POST a JSON body to a URL; await the response; return @(status, parsedBody)@.
-- The parsed body is 'Left' on JSON decode failure, 'Right' on success.
fetchJson :: MisoString -> Value -> IO (Int, Either String Value)
fetchJson url body = do
  let bodyBytes = encode body
      bodyMs = MS.pack (BSL.unpack bodyBytes)
  resp <- js_fetchPost (msToVal url) (msToVal bodyMs)
  status <- js_respStatus resp
  textVal <- js_respText resp
  let text = valToMs textVal
      parsed = eitherDecode (BSL.pack (MS.unpack text))
  pure (status, parsed)
