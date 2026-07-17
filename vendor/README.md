# Temporary SurrealDB vendor

`react-native-surrealdb` is vendored from commit `13cf061bbeca15fe5cfd3e3089146dbedbb2f61b` until the package is published to npm.

The package source is tracked in Git. Its generated XCFramework and Android `jniLibs` are ignored because individual iOS libraries exceed GitHub's 100 MB file limit. `.easignore` explicitly includes those local binaries when an EAS build is started from this checkout.

Before refreshing the vendor, run `pnpm --filter react-native-surrealdb run release:artifacts` in the package repository and copy the publishable package files into `vendor/react-native-surrealdb`. Then run `pnpm verify:surrealdb-vendor` in Youmotion.

After npm publication, replace the `link:` dependency with the published version and remove this directory, the EAS pre-install verification script, and the `.easignore` binary exceptions.
