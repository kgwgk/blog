{-# LANGUAGE CPP #-}
{-# LANGUAGE OverloadedStrings #-}

module Main where

import Miso
import Miso.CSS (style_)
import Miso.Html.Element (button_, div_, span_)
import Miso.Html.Event (onClick)

#ifdef WASM
foreign export javascript "hs_start" main :: IO ()
#endif

type Model = Int

data Action
  = AddOne
  | SubtractOne

main :: IO ()
main = startApp defaultEvents counter

counter :: App Model Action
counter =
  (component 0 updateModel viewModel)
    { mountPoint = Just "miso-counter"
    }

updateModel :: Action -> Effect ROOT Model Action
updateModel AddOne = modify (+ 1)
updateModel SubtractOne = modify (subtract 1)

viewModel :: Model -> View Model Action
viewModel x =
  div_
    []
    [ button_ [onClick SubtractOne] [text "-"]
    , span_ [style_ [("margin", "0 12px")]] [text (ms (show x))]
    , button_ [onClick AddOne] [text "+"]
    ]
