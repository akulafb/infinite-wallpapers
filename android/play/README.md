# Google Play release checklist

Drafts for the listing and forms are in this folder:
[listing.md](listing.md) and [data-safety.md](data-safety.md).

1. [ ] **Developer account.** Sign up at play.google.com/console ($25 one-time) and
       finish identity verification.
2. [ ] **Upload key.** Create a keystore, copy `android/keystore.properties.example`
       to `android/keystore.properties`, and fill it in. Back up the `.jks` file
       and passwords outside the repo.
3. [ ] **Signed AAB.** From `android/`, run `./gradlew bundleRelease`. The file is
       `app/build/outputs/bundle/release/app-release.aab`. Bump `versionCode`
       in `app/build.gradle.kts` for every upload.
4. [ ] **Create the app** in Play Console (name: Infinite Wallpapers, app, free).
5. [ ] **Play App Signing.** Accept the default (Google holds the app signing
       key; your keystore is only the upload key).
6. [x] **Privacy policy URL.** Live at
       `https://akulafb.github.io/infinite-wallpapers/privacy-policy.html`,
       served from the `gh-pages` branch (only that file is public). To update
       it, edit `docs/privacy-policy.html` and copy it to `gh-pages`.
7. [ ] **Store listing.** Paste the name, short and full description from
       `listing.md`. Set category to Personalization and add the contact email.
8. [ ] **Screenshots.** At least 2 phone screenshots, portrait, about 1080x1920
       (PNG or JPEG, no frames needed).
9. [ ] **App icon.** 512x512 PNG (32-bit, max 1 MB).
10. [ ] **Feature graphic.** 1024x500 PNG or JPEG, no transparency.
11. [ ] **Data safety.** Fill in from `data-safety.md`.
12. [ ] **Content rating.** Complete the IARC questionnaire from `data-safety.md`.
13. [ ] **Target audience, ads, and other App content** declarations from
        `data-safety.md`.
14. [ ] **Closed test.** New personal accounts must run a closed test with at
        least 12 testers opted in for 14 days in a row before production.
        Upload the AAB to a closed testing track and share the opt-in link.
15. [ ] **Apply for production access** in the Dashboard once the 14 days are
        done, answer the questions about the test, and wait for approval.
16. [ ] **Production release.** Promote the build (or upload a new one), add
        release notes, and send for review.
