{-# LANGUAGE OverloadedStrings #-}

-- | Native-GHC tests for the FFI-free auth logic in the @auth-pure@ library.
-- Example tests use hspec; property tests use hedgehog via hspec-hedgehog.
module Main (main) where

import Auth.Pure.Hash (parseHashParams)
import Auth.Pure.Messages (authErrorMessage)
import Auth.Pure.Routing (Page (..), pageFromPath)
import Data.List (sort)
import qualified Data.Text as T
import Hedgehog (forAll, (===))
import qualified Hedgehog.Gen as Gen
import qualified Hedgehog.Range as Range
import Test.Hspec
import Test.Hspec.Hedgehog (hedgehog)

main :: IO ()
main = hspec $ do
  routingSpec
  hashSpec
  messagesSpec

------------------------------------------------------------------------------
-- Routing
------------------------------------------------------------------------------

routingSpec :: Spec
routingSpec = describe "Auth.Pure.Routing.pageFromPath" $ do
  it "maps each known path to its page" $ do
    pageFromPath "/login" `shouldBe` Login
    pageFromPath "/register" `shouldBe` Register
    pageFromPath "/forgot-password" `shouldBe` Forgot
    pageFromPath "/reset-password" `shouldBe` Reset
    pageFromPath "/members" `shouldBe` Members
    pageFromPath "/members/" `shouldBe` Members

  it "treats an unknown path as Unknown" $
    pageFromPath "/nope" `shouldBe` Unknown

  it "never returns a known page for an arbitrary unknown path" $
    hedgehog $ do
      -- Generate paths that are NOT in the known set.
      let known =
            [ "/login"
            , "/register"
            , "/forgot-password"
            , "/reset-password"
            , "/members"
            , "/members/"
            ]
      seg <- forAll $ Gen.text (Range.linear 0 12) Gen.alphaNum
      let path = "/" <> seg
      if path `elem` known
        then pure ()
        else pageFromPath path === Unknown

------------------------------------------------------------------------------
-- Hash parsing
------------------------------------------------------------------------------

hashSpec :: Spec
hashSpec = describe "Auth.Pure.Hash.parseHashParams" $ do
  it "parses a Supabase recovery fragment" $
    parseHashParams "access_token=a&refresh_token=r&type=recovery"
      `shouldBe` [("access_token", "a"), ("refresh_token", "r"), ("type", "recovery")]

  it "keeps only the first '=' as the delimiter" $
    parseHashParams "k=a=b=c" `shouldBe` [("k", "a=b=c")]

  it "treats a key with no '=' as an empty value" $
    parseHashParams "flag" `shouldBe` [("flag", "")]

  it "drops empty segments from stray '&'" $
    parseHashParams "a=1&&b=2" `shouldBe` [("a", "1"), ("b", "2")]

  it "is empty for an empty fragment" $
    parseHashParams "" `shouldBe` []

  it "round-trips encoded key=value pairs" $ hedgehog $ do
    let genKey = Gen.text (Range.linear 1 8) Gen.alpha
        genVal = Gen.text (Range.linear 0 8) Gen.alpha
    pairs <- forAll $ Gen.list (Range.linear 1 6) ((,) <$> genKey <*> genVal)
    -- Keys may collide; compare as sets after rendering+parsing.
    let encoded = T.intercalate "&" [k <> "=" <> v | (k, v) <- pairs]
    sort (parseHashParams encoded) === sort [(k, v) | (k, v) <- pairs]

------------------------------------------------------------------------------
-- Messages
------------------------------------------------------------------------------

messagesSpec :: Spec
messagesSpec = describe "Auth.Pure.Messages.authErrorMessage" $ do
  it "has a distinct message for pending accounts" $
    authErrorMessage "pending" `shouldBe` "Your account is awaiting admin approval."

  it "collapses every other code to the generic message" $ hedgehog $ do
    code <- forAll $ Gen.filterT (/= "pending") (Gen.text (Range.linear 0 12) Gen.alphaNum)
    authErrorMessage code === "Invalid email or password."
