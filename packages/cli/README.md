@sigauth/cli
=================

CLI tool to generate sigauth typescript types


[![oclif](https://img.shields.io/badge/cli-oclif-brightgreen.svg)](https://oclif.io)
[![Version](https://img.shields.io/npm/v/@sigauth/cli.svg)](https://npmjs.org/package/@sigauth/cli)
[![Downloads/week](https://img.shields.io/npm/dw/@sigauth/cli.svg)](https://npmjs.org/package/@sigauth/cli)


<!-- toc -->
* [Usage](#usage)
* [Commands](#commands)
<!-- tocstop -->
# Usage
<!-- usage -->
```sh-session
$ npm install -g @sigauth/cli
$ sigauth COMMAND
running command...
$ sigauth (--version)
@sigauth/cli/0.0.0 win32-x64 node-v22.20.0
$ sigauth --help [COMMAND]
USAGE
  $ sigauth COMMAND
...
```
<!-- usagestop -->
# Commands
<!-- commands -->
* [`sigauth hello PERSON`](#sigauth-hello-person)
* [`sigauth hello world`](#sigauth-hello-world)
* [`sigauth help [COMMAND]`](#sigauth-help-command)
* [`sigauth plugins`](#sigauth-plugins)
* [`sigauth plugins add PLUGIN`](#sigauth-plugins-add-plugin)
* [`sigauth plugins:inspect PLUGIN...`](#sigauth-pluginsinspect-plugin)
* [`sigauth plugins install PLUGIN`](#sigauth-plugins-install-plugin)
* [`sigauth plugins link PATH`](#sigauth-plugins-link-path)
* [`sigauth plugins remove [PLUGIN]`](#sigauth-plugins-remove-plugin)
* [`sigauth plugins reset`](#sigauth-plugins-reset)
* [`sigauth plugins uninstall [PLUGIN]`](#sigauth-plugins-uninstall-plugin)
* [`sigauth plugins unlink [PLUGIN]`](#sigauth-plugins-unlink-plugin)
* [`sigauth plugins update`](#sigauth-plugins-update)

## `sigauth hello PERSON`

Say hello

```
USAGE
  $ sigauth hello PERSON -f <value>

ARGUMENTS
  PERSON  Person to say hello to

FLAGS
  -f, --from=<value>  (required) Who is saying hello

DESCRIPTION
  Say hello

EXAMPLES
  $ sigauth hello friend --from oclif
  hello friend from oclif! (./src/commands/hello/index.ts)
```

_See code: [src/commands/hello/index.ts](https://github.com/packages/cli/blob/v0.0.0/src/commands/hello/index.ts)_

## `sigauth hello world`

Say hello world

```
USAGE
  $ sigauth hello world

DESCRIPTION
  Say hello world

EXAMPLES
  $ sigauth hello world
  hello world! (./src/commands/hello/world.ts)
```

_See code: [src/commands/hello/world.ts](https://github.com/packages/cli/blob/v0.0.0/src/commands/hello/world.ts)_

## `sigauth help [COMMAND]`

Display help for sigauth.

```
USAGE
  $ sigauth help [COMMAND...] [-n]

ARGUMENTS
  [COMMAND...]  Command to show help for.

FLAGS
  -n, --nested-commands  Include all nested commands in the output.

DESCRIPTION
  Display help for sigauth.
```

_See code: [@oclif/plugin-help](https://github.com/oclif/plugin-help/blob/v6.2.36/src/commands/help.ts)_

## `sigauth plugins`

List installed plugins.

```
USAGE
  $ sigauth plugins [--json] [--core]

FLAGS
  --core  Show core plugins.

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  List installed plugins.

EXAMPLES
  $ sigauth plugins
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v5.4.54/src/commands/plugins/index.ts)_

## `sigauth plugins add PLUGIN`

Installs a plugin into sigauth.

```
USAGE
  $ sigauth plugins add PLUGIN... [--json] [-f] [-h] [-s | -v]

ARGUMENTS
  PLUGIN...  Plugin to install.

FLAGS
  -f, --force    Force npm to fetch remote resources even if a local copy exists on disk.
  -h, --help     Show CLI help.
  -s, --silent   Silences npm output.
  -v, --verbose  Show verbose npm output.

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Installs a plugin into sigauth.

  Uses npm to install plugins.

  Installation of a user-installed plugin will override a core plugin.

  Use the SIGAUTH_NPM_LOG_LEVEL environment variable to set the npm loglevel.
  Use the SIGAUTH_NPM_REGISTRY environment variable to set the npm registry.

ALIASES
  $ sigauth plugins add

EXAMPLES
  Install a plugin from npm registry.

    $ sigauth plugins add myplugin

  Install a plugin from a github url.

    $ sigauth plugins add https://github.com/someuser/someplugin

  Install a plugin from a github slug.

    $ sigauth plugins add someuser/someplugin
```

## `sigauth plugins:inspect PLUGIN...`

Displays installation properties of a plugin.

```
USAGE
  $ sigauth plugins inspect PLUGIN...

ARGUMENTS
  PLUGIN...  [default: .] Plugin to inspect.

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Displays installation properties of a plugin.

EXAMPLES
  $ sigauth plugins inspect myplugin
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v5.4.54/src/commands/plugins/inspect.ts)_

## `sigauth plugins install PLUGIN`

Installs a plugin into sigauth.

```
USAGE
  $ sigauth plugins install PLUGIN... [--json] [-f] [-h] [-s | -v]

ARGUMENTS
  PLUGIN...  Plugin to install.

FLAGS
  -f, --force    Force npm to fetch remote resources even if a local copy exists on disk.
  -h, --help     Show CLI help.
  -s, --silent   Silences npm output.
  -v, --verbose  Show verbose npm output.

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Installs a plugin into sigauth.

  Uses npm to install plugins.

  Installation of a user-installed plugin will override a core plugin.

  Use the SIGAUTH_NPM_LOG_LEVEL environment variable to set the npm loglevel.
  Use the SIGAUTH_NPM_REGISTRY environment variable to set the npm registry.

ALIASES
  $ sigauth plugins add

EXAMPLES
  Install a plugin from npm registry.

    $ sigauth plugins install myplugin

  Install a plugin from a github url.

    $ sigauth plugins install https://github.com/someuser/someplugin

  Install a plugin from a github slug.

    $ sigauth plugins install someuser/someplugin
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v5.4.54/src/commands/plugins/install.ts)_

## `sigauth plugins link PATH`

Links a plugin into the CLI for development.

```
USAGE
  $ sigauth plugins link PATH [-h] [--install] [-v]

ARGUMENTS
  PATH  [default: .] path to plugin

FLAGS
  -h, --help          Show CLI help.
  -v, --verbose
      --[no-]install  Install dependencies after linking the plugin.

DESCRIPTION
  Links a plugin into the CLI for development.

  Installation of a linked plugin will override a user-installed or core plugin.

  e.g. If you have a user-installed or core plugin that has a 'hello' command, installing a linked plugin with a 'hello'
  command will override the user-installed or core plugin implementation. This is useful for development work.


EXAMPLES
  $ sigauth plugins link myplugin
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v5.4.54/src/commands/plugins/link.ts)_

## `sigauth plugins remove [PLUGIN]`

Removes a plugin from the CLI.

```
USAGE
  $ sigauth plugins remove [PLUGIN...] [-h] [-v]

ARGUMENTS
  [PLUGIN...]  plugin to uninstall

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Removes a plugin from the CLI.

ALIASES
  $ sigauth plugins unlink
  $ sigauth plugins remove

EXAMPLES
  $ sigauth plugins remove myplugin
```

## `sigauth plugins reset`

Remove all user-installed and linked plugins.

```
USAGE
  $ sigauth plugins reset [--hard] [--reinstall]

FLAGS
  --hard       Delete node_modules and package manager related files in addition to uninstalling plugins.
  --reinstall  Reinstall all plugins after uninstalling.
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v5.4.54/src/commands/plugins/reset.ts)_

## `sigauth plugins uninstall [PLUGIN]`

Removes a plugin from the CLI.

```
USAGE
  $ sigauth plugins uninstall [PLUGIN...] [-h] [-v]

ARGUMENTS
  [PLUGIN...]  plugin to uninstall

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Removes a plugin from the CLI.

ALIASES
  $ sigauth plugins unlink
  $ sigauth plugins remove

EXAMPLES
  $ sigauth plugins uninstall myplugin
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v5.4.54/src/commands/plugins/uninstall.ts)_

## `sigauth plugins unlink [PLUGIN]`

Removes a plugin from the CLI.

```
USAGE
  $ sigauth plugins unlink [PLUGIN...] [-h] [-v]

ARGUMENTS
  [PLUGIN...]  plugin to uninstall

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Removes a plugin from the CLI.

ALIASES
  $ sigauth plugins unlink
  $ sigauth plugins remove

EXAMPLES
  $ sigauth plugins unlink myplugin
```

## `sigauth plugins update`

Update installed plugins.

```
USAGE
  $ sigauth plugins update [-h] [-v]

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Update installed plugins.
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v5.4.54/src/commands/plugins/update.ts)_
<!-- commandsstop -->
