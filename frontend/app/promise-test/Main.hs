{-# LANGUAGE CPP #-}

module Main where

import GHC.Wasm.Prim

#ifdef WASM
foreign export javascript "hs_start" main :: IO ()
#endif

-- Test 1: Promise.resolve with a JSVal (since JSString has no messagePromise primitive)
foreign import javascript safe "Promise.resolve(\"hello-from-promise\")"
  js_resolveVal :: IO JSVal

-- Test 2: async IIFE returning a JSVal
foreign import javascript safe "(async () => { return \"hello-from-async\"; })()"
  js_asyncVal :: IO JSVal

-- Test 3: plain synchronous JS expression returning JSVal (baseline)
foreign import javascript safe "\"hello-from-sync\""
  js_syncVal :: IO JSVal

-- Convert JSVal to JSString via coerce (JSString is a newtype over JSVal)
foreign import javascript unsafe "String($1)"
  js_toString :: JSVal -> IO JSString

main :: IO ()
main = do
  v1 <- js_resolveVal
  v2 <- js_asyncVal
  v3 <- js_syncVal
  s1 <- js_toString v1
  s2 <- js_toString v2
  s3 <- js_toString v3
  putStrLn $ "Promise.resolve(): " ++ fromJSString s1
  putStrLn $ "async () => ...: " ++ fromJSString s2
  putStrLn $ "sync expression: " ++ fromJSString s3
