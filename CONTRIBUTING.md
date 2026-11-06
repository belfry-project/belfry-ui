# Welcome to the contributing guide

Thank you for investing your time in contributing to our project!

To get an overview of the project, read the [README](README.md). The process (issues, pull requests against `main`, commit messages, CI, code of conduct) is the same for every Belfry repository and is described in the organization's [contributing guide](https://github.com/belfry-project/.github/blob/main/CONTRIBUTING.md). This file covers what is specific to the UI.

## Issues

If you find a problem with the UI, search the [issues](https://github.com/belfry-project/belfry-ui/issues) to see if it was already reported. If not, open a new issue. Never report a security vulnerability in a public issue; see the [security policy](https://github.com/belfry-project/.github/blob/main/SECURITY.md).

## Code changes

Create a branch from `main` with your changes and open a pull request against `main`; it will be reviewed. No Developer Certificate of Origin sign-off is required.

## Text and Internationalization

## Internationalization

Internationalization leans on the [i18next](https://www.i18next.com/) library. We use this library to mark our strings for translation.

### Marking strings for translation and replacement in the UI

The i18next library provides various React helpers for dealing with both marking strings for translation, and replacing strings that have been translated. For consistency and ease of use, we have consolidated on one pattern for the codebase. To set strings to be translated in the UI:

- import the `useTranslation` react hook from the `react-i18next`.
- wrap your string using the following format: `t('String to be translated')`

**Note:** If you have a variable string with text that needs translating, you must wrap it in ``t(`${variable} string`)`` where it is defined.

**Note:** Pluralization can be complicated so it is best to allow i18next handle cases where we have a string that may need to be pluralized based on number of items, or count. In that case i18next we will still use the `useTranslation` hook from above, but this time we will pass in a count variable. For example `t('Count of item to be translation', {count})`.

**Node:**
If an element does not have a string to be rendered on the screen then `aria-label` with string marked for translation should be included.

### Text Casing

For information about text casing (ie. when to use sentence casing and when to use other casing types) see our [CAPITALIZATION](docs/CAPITALIZATION.md) documentation
