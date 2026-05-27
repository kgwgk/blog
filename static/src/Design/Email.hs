{- | Supabase auth email templates, generated from 'Design.Tokens' so the
emails stay in sync with the site design.

Email-client constraints honored BY CONSTRUCTION:

  * inline @style=@ attributes ONLY — no @\<link\>@, no @\<style\>@ element, no
    external CSS, and no CSS variables (@var(--...)@).
  * the light palette only — dark-mode email styling is out of scope.
  * Supabase Go-template placeholders (e.g. @{{ .ConfirmationURL }}@) are emitted
    as LITERAL text. In @href@ attributes lucid does not escape the curly braces,
    so the placeholder survives verbatim; placeholders embedded in body text use
    'toHtmlRaw' so the braces are not HTML-escaped.
-}
module Design.Email (
    EmailTemplate (..),
    allTemplates,
    templateSubject,
    templateHtml,
    emailPayload,
) where

import Data.Aeson (Value, object, (.=))
import Data.Text qualified as T
import Data.Text.Lazy qualified as LText
import Design.Tokens
import Lucid
import Relude

-- | The five Supabase auth email templates.
data EmailTemplate
    = ConfirmSignup
    | InviteUser
    | MagicLink
    | ChangeEmail
    | ResetPassword
    deriving stock (Eq, Show, Enum, Bounded)

-- | Every template, in declaration order.
allTemplates :: [EmailTemplate]
allTemplates = [minBound .. maxBound]

-- | The Supabase subject line for each template (maps to @mailer_subjects_*@).
templateSubject :: EmailTemplate -> Text
templateSubject = \case
    ConfirmSignup -> "Confirm Your Signup"
    InviteUser -> "You have been invited"
    MagicLink -> "Your Magic Link"
    ChangeEmail -> "Confirm Email Change"
    ResetPassword -> "Reset Your Password"

{- | The full rendered HTML body for each template (maps to
@mailer_templates_*_content@).
-}
templateHtml :: EmailTemplate -> Text
templateHtml = LText.toStrict . renderText . templateDoc

-- * Inline-style strings, built from the single source of truth

light :: Palette
light = lightPalette

-- | Outer page background wrapper.
bodyStyle :: Text
bodyStyle =
    T.intercalate
        ";"
        [ "margin:0"
        , "padding:24px"
        , "background:" <> bgColor light
        , "color:" <> textColor light
        , "font-family:" <> bodyTextFont fonts
        , "line-height:1.5"
        ]

-- | Centered card the content sits in.
containerStyle :: Text
containerStyle =
    T.intercalate
        ";"
        [ "max-width:560px"
        , "margin:0 auto"
        , "padding:32px"
        , "background:" <> bgColor light
        , "border:1px solid " <> borderColor light
        , "border-radius:8px"
        ]

-- | Site-name header.
siteNameStyle :: Text
siteNameStyle =
    T.intercalate
        ";"
        [ "margin:0 0 24px"
        , "font-family:" <> headingFont fonts
        , "font-size:20px"
        , "font-weight:700"
        , "color:" <> primaryColor light
        ]

-- | Per-template heading.
headingStyle :: Text
headingStyle =
    T.intercalate
        ";"
        [ "margin:0 0 16px"
        , "font-family:" <> headingFont fonts
        , "font-size:24px"
        , "color:" <> textColor light
        ]

-- | Body paragraph.
paragraphStyle :: Text
paragraphStyle =
    T.intercalate
        ";"
        [ "margin:0 0 16px"
        , "font-size:16px"
        , "color:" <> textColor light
        ]

-- | The action button (an @\<a\>@ styled as a button).
buttonStyle :: Text
buttonStyle =
    T.intercalate
        ";"
        [ "display:inline-block"
        , "margin:8px 0 24px"
        , "padding:12px 24px"
        , "background:" <> primaryColor light
        , "color:" <> bgColor light
        , "font-family:" <> headingFont fonts
        , "font-size:16px"
        , "font-weight:700"
        , "text-decoration:none"
        , "border-radius:6px"
        ]

-- | Footer.
footerStyle :: Text
footerStyle =
    T.intercalate
        ";"
        [ "margin:24px 0 0"
        , "padding-top:16px"
        , "border-top:1px solid " <> borderColor light
        , "font-size:13px"
        , "color:" <> mediumGreyColor light
        ]

-- * Per-template content

{- | The Supabase placeholder used as the action-button @href@. All five
templates use @{{ .ConfirmationURL }}@.
-}
confirmationUrl :: Text
confirmationUrl = "{{ .ConfirmationURL }}"

data Content = Content
    { cHeading :: Text
    , cBody :: [Html ()]
    , cButton :: Text
    }

templateContent :: EmailTemplate -> Content
templateContent = \case
    ConfirmSignup ->
        Content
            { cHeading = "Confirm your signup"
            , cBody =
                [ toHtml ("Thanks for signing up. Please confirm your email address to finish creating your account." :: Text)
                ]
            , cButton = "Confirm email"
            }
    InviteUser ->
        Content
            { cHeading = "You have been invited"
            , cBody =
                [ toHtml ("You have been invited to hcentner's blog. Accept the invitation to set up your account." :: Text)
                ]
            , cButton = "Accept invite"
            }
    MagicLink ->
        Content
            { cHeading = "Your magic link"
            , cBody =
                [ toHtml ("Click the button below to sign in to hcentner's blog." :: Text)
                ]
            , cButton = "Sign in"
            }
    ChangeEmail ->
        Content
            { cHeading = "Confirm email change"
            , cBody =
                [ toHtmlRaw ("Confirm changing your email to {{ .NewEmail }}." :: Text)
                ]
            , cButton = "Confirm change"
            }
    ResetPassword ->
        Content
            { cHeading = "Reset your password"
            , cBody =
                [ toHtml ("We received a request to reset your password. Click the button below to choose a new one." :: Text)
                ]
            , cButton = "Reset password"
            }

-- | The shared layout, parameterized over per-template content.
templateDoc :: EmailTemplate -> Html ()
templateDoc t =
    let c = templateContent t
     in div_ [style_ bodyStyle] $
            div_ [style_ containerStyle] $ do
                p_ [style_ siteNameStyle] "hcentner's blog"
                h1_ [style_ headingStyle] (toHtml (cHeading c))
                traverse_ (p_ [style_ paragraphStyle]) (cBody c)
                a_ [href_ confirmationUrl, style_ buttonStyle] (toHtml (cButton c))
                p_ [style_ footerStyle] "If you did not request this email, you can safely ignore it."

-- * JSON payload for the Supabase Management API

-- | The ten-key payload for @PATCH \/v1\/projects\/{ref}\/config\/auth@.
emailPayload :: Value
emailPayload =
    object
        [ "mailer_subjects_confirmation" .= templateSubject ConfirmSignup
        , "mailer_templates_confirmation_content" .= templateHtml ConfirmSignup
        , "mailer_subjects_invite" .= templateSubject InviteUser
        , "mailer_templates_invite_content" .= templateHtml InviteUser
        , "mailer_subjects_magic_link" .= templateSubject MagicLink
        , "mailer_templates_magic_link_content" .= templateHtml MagicLink
        , "mailer_subjects_email_change" .= templateSubject ChangeEmail
        , "mailer_templates_email_change_content" .= templateHtml ChangeEmail
        , "mailer_subjects_recovery" .= templateSubject ResetPassword
        , "mailer_templates_recovery_content" .= templateHtml ResetPassword
        ]
