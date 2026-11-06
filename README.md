# Belfry UI

The web UI of [Belfry](https://github.com/belfry-project/belfry), the community continuation of AWX. Belfry builds its UI from the `main` branch of this repository (`UI_MODE=AWX`, product name "Belfry").

This repository is a continuation of [Ansible UI](https://github.com/ansible/ansible-ui) (its `main` branch as of September 2024), which also contains the UIs for Automation Hub and Event-Driven Ansible. Those are kept as they are but are not built or published by Belfry.

AWX and Ansible are trademarks of Red Hat, Inc. Belfry is not affiliated with or endorsed by Red Hat, Inc.; the Belfry build does not use the AWX logo.

- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [NPM Scripts](#npm-scripts)
- [Documentation](#documentation)
- [Code of Conduct](#code-of-conduct)

## Getting Started

1. Prerequisites

   - Node 18.x (recommended)
   - NPM 8.x (recommended)

   Note: The project should with older versions of node and npm but may require regenerating the package-lock.json.

2. Clone Repository

   ```zsh
   git clone https://github.com/belfry-project/belfry-ui.git
   ```

3. Install Package Dependencies

   ```zsh
   npm ci
   ```

## Environment Variables

|    Environment Variable | Description                                         |
| ----------------------: | --------------------------------------------------- |
|            `AWX_SERVER` | The AWX server (protocol://host:port).              |
|          `AWX_USERNAME` | The AWX server username. (only used by Cypress)     |
|          `AWX_PASSWORD` | The AWX server password. (only used by Cypress)     |
|                         |                                                     |
|            `EDA_SERVER` | The EDA server (protocol://host:port).              |
|          `EDA_USERNAME` | The EDA server username. (only used by Cypress)     |
|          `EDA_PASSWORD` | The EDA server password. (only used by Cypress)     |
|                         |                                                     |
|            `HUB_SERVER` | The HUB server (protocol://host:port).              |
|          `HUB_USERNAME` | The HUB server username. (only used by Cypress)     |
|          `HUB_PASSWORD` | The HUB server password. (only used by Cypress)     |
|        `HUB_API_PREFIX` | The HUB server API prefix. (`/api/galaxy`)          |
| `HUB_GALAXYKIT_COMMAND` | The galaxykit command. (`galaxykit --ignore-certs`) |

```zsh
export AWX_SERVER=https://localhost:8043
export AWX_USERNAME='my-user'
export AWX_PASSWORD='my-password'

export EDA_SERVER=http://localhost:8000
export EDA_USERNAME='my-user'
export EDA_PASSWORD='my-password'

export HUB_SERVER=http://localhost:5001
export HUB_USERNAME='my-user'
export HUB_PASSWORD='my-password'
```

> Note: For Hub integration tests: Check that the Ansible binary was correctly installed under the Python directory. Add it to the PATH variable. This is needed for the galaxykit commands that create hub resources for tests.

## NPM Scripts

| NPM Script                  | Description                             |
| --------------------------- | --------------------------------------- |
| `npm run awx`               | Run AWX on <http://localhost:4101>      |
| `npm run e2e:awx`           | Run AWX E2E tests from Cypress UI       |
| `npm run e2e:run:awx`       | Run AWX E2E tests from CLI              |
| `npm run component:awx`     | Run AWX component tests from Cypress UI |
| `npm run component:run:awx` | Run AWX component tests from CLI        |
|                             |                                         |
| `npm run hub`               | Run HUB on <http://localhost:4102>      |
| `npm run e2e:hub`           | Run HUB E2E tests from Cypress UI       |
| `npm run e2e:run:hub`       | Run HUB E2E tests from CLI              |
| `npm run component:hub`     | Run HUB component tests from Cypress UI |
| `npm run component:run:hub` | Run HUB component tests from CLI        |
|                             |                                         |
| `npm run eda`               | Run EDA on <http://localhost:4103>      |
| `npm run e2e:eda`           | Run EDA E2E tests from Cypress UI       |
| `npm run e2e:run:eda`       | Run EDA E2E tests from CLI              |
| `npm run component:eda`     | Run EDA component tests from Cypress UI |
| `npm run component:run:eda` | Run EDA component tests from CLI        |
|                             |                                         |
| `npm run tsc`               | Run Typescript compiler checks          |
| `npm run eslint`            | Run eslint checks                       |
| `npm run prettier`          | Run prettier format checks              |
| `npm run prettier:fix`      | Fix prettier format of files            |

## Documentation

- [Development](./docs/DEVELOPMENT.md)
- [Framework](./framework/README.md) - A framework for building applications using [PatternFly](https://www.patternfly.org).
- [Handling Errors in Forms](./framework/PageForm/README.md) - A component for handling forms and errors.

## Code of Conduct

Everyone taking part in Belfry follows the [Belfry Code of Conduct](https://github.com/belfry-project/.github/blob/main/CODE_OF_CONDUCT.md). Report security vulnerabilities privately, as described in the [security policy](https://github.com/belfry-project/.github/blob/main/SECURITY.md), never in a public issue.
