[![StepSecurity Maintained Action](https://raw.githubusercontent.com/step-security/maintained-actions-assets/main/assets/maintained-action-banner.png)](https://docs.stepsecurity.io/actions/stepsecurity-maintained-actions)

# Cross-Platform GitHub Action

This project provides a GitHub action for running GitHub Actions workflows on
multiple platforms, including platforms that GitHub Actions doesn't currently natively support.

## `Features`

Some of the features that this action supports include:

- Multiple operating systems with one single action
- Multiple versions of each operating system
- Non-x86_64 architectures
- Allows to use default shell or Bash shell
- Low boot overhead
- Fast execution
- Using the action in multiple steps in the same job

## `Usage`

### Minimal Example

Here's a sample workflow file which will run the given commands on FreeBSD 15.1.

```yaml
name: CI

on: [push]

jobs:
  test:
    runs-on: ubuntu-latest
    defaults:
      run:
        shell: cpa.sh {0}

    steps:
      - uses: actions/checkout@v7

      - name: Start VM
        uses: step-security/cross-platform-actions-action@v1
        with:
          operating_system: freebsd
          version: '15.1'

      - name: Test
        run: |
          uname -a
          echo $SHELL
          pwd
          ls -lah
          whoami
          env | sort
```

### Full Example

Here's a sample workflow file which will set up a matrix resulting in nine
jobs. One which will run on FreeBSD 15.1, one which runs OpenBSD 7.9, one which
runs NetBSD 10.0, one which runs OpenBSD 7.9 on ARM64, one which runs NetBSD
10.1 on ARM64, one which runs DragonFly BSD 6.4.2, one which runs MidnightBSD
4.0.4, one which runs Haiku R1/beta5 and one which runs OmniOS r151056.

```yaml
name: CI

on: [push]

jobs:
  test:
    runs-on: ubuntu-latest
    defaults:
      run:
        shell: cpa.sh {0}
    strategy:
      matrix:
        os:
          - name: freebsd
            architecture: x86-64
            version: '15.1'

          - name: openbsd
            architecture: x86-64
            version: '7.9'

          - name: openbsd
            architecture: arm64
            version: '7.9'

          - name: netbsd
            architecture: x86-64
            version: '10.1'

          - name: netbsd
            architecture: arm64
            version: '10.1'

          - name: dragonflybsd
            architecture: x86-64
            version: '6.4.2'

          - name: midnightbsd
            architecture: x86-64
            version: '4.0.4'

          - name: haiku
            architecture: x86-64
            version: 'r1beta5'

          - name: omnios
            architecture: x86-64
            version: 'r151056'

    steps:
      - uses: actions/checkout@v7

      - name: Start VM on ${{ matrix.os.name }}
        uses: step-security/cross-platform-actions-action@v1
        env:
          MY_ENV1: MY_ENV1
          MY_ENV2: MY_ENV2
        with:
          environment_variables: MY_ENV1 MY_ENV2
          operating_system: ${{ matrix.os.name }}
          architecture: ${{ matrix.os.architecture }}
          version: ${{ matrix.os.version }}
          shell: bash
          memory: 5G
          cpu_count: 4

      - name: Test 1 on ${{ matrix.os.name }}
        run: |
          uname -a
          echo $SHELL
          pwd

      - name: Test 2 on ${{ matrix.os.name }}
        run: |
          ls -lah
          whoami
          env | sort
```

Different platforms need to run on different runners, so see the
[Runners](#runners) section below.

### Helper Script

When the action starts the VM, the `cpa.sh` helper is added to the runner's
`PATH` and can be used in subsequent steps. It runs commands inside the VM
and can also synchronize files or reboot the VM:

```
cpa.sh FILE [POST_FLAGS...]       # Run FILE inside the VM
cpa.sh --sync-files [DIRECTION]   # Synchronize files between the runner and the VM
cpa.sh --reboot                   # Reboot the VM and wait until it's reachable again
```

When `FILE` is given (typically via `shell: cpa.sh {0}`), files are
synchronized automatically: runner-to-vm before the file is executed and
vm-to-runner after. Pass `--sync-files DIRECTION` as a `POST_FLAG` to change
this. `DIRECTION` accepts:

- `both` (default) — sync runner-to-vm before and vm-to-runner after
- `none` — skip syncing entirely
- `runner-to-vm` — only sync runner-to-vm before the file runs
- `vm-to-runner` — only sync vm-to-runner after the file runs

`--reboot` may also be given as a `POST_FLAG` to reboot the VM after the file
has run (and after the post-sync, if any).

`--environment-variables NAME1 NAME2 ...` may be given as a `POST_FLAG` to
forward additional environment variables to the VM for that step, on top of the
ones declared via the action's [`environment_variables`](#inputs) input. List
the names separated by spaces and do not quote them (GitHub Actions splits the
`shell` line on spaces without honoring quotes). The named variables are read
from the step's environment (set them with `env:`), so they don't need to be
listed on the `Start VM` step.

```yaml
- name: Run a command inside the VM
  shell: cpa.sh {0}
  run: uname -a

- name: Run a command without syncing files
  shell: cpa.sh {0} --sync-files none
  run: uname -a

- name: Run a command and reboot afterwards
  shell: cpa.sh {0} --reboot
  run: sysctl -w some.setting=1

- name: Run a command with extra environment variables
  shell: cpa.sh {0} --environment-variables MY_ENV1 MY_ENV2
  env:
    MY_ENV1: value1
    MY_ENV2: value2
  run: echo "$MY_ENV1 $MY_ENV2"
```

Use the standalone forms when you don't need to run a command. In standalone
mode `--sync-files` defaults to `both` and runs the sync as a one-shot:

```yaml
- name: Sync files from the runner to the VM
  run: cpa.sh --sync-files runner-to-vm

- name: Reboot the VM
  run: cpa.sh --reboot
```

### Inputs

This section lists the available inputs for the action.

| Input                   | Required | Default Value     | Type    | Description                                                                                                                                                                                                                                                  |
|-------------------------|----------|-------------------|---------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `run`                   | ❌       | `""`              | string  | **Deprecated.** Runs command-line programs using the operating system's shell. This will be executed inside the virtual machine. Prefer the `cpa.sh` custom shell (`shell: cpa.sh {0}`) in subsequent steps instead.                                         |
| `operating_system`      | ✅       | ❌                | string  | The type of operating system to run the job on. See [Supported Platforms](#supported-platforms).                                                                                                                                                             |
| `architecture`          | ❌       | `x86-64`          | string  | The architecture of the operating system. See [Supported Platforms](#supported-platforms).                                                                                                                                                                   |
| `version`               | ✅       | ❌                | string  | The version of the operating system to use. See [Supported Platforms](#supported-platforms).                                                                                                                                                                 |
| `shell`                 | ❌       | `default`         | string  | The shell to use to execute the commands. Defaults to the default shell for the given operating system. Allowed values are: `default`, `sh` and `bash`                                                                                                       |
| `environment_variables` | ❌       | `""`              | string  | A list of environment variables to forward to the virtual machine. The list should be separated with spaces. The `CI` and any environment variables starting with `GITHUB_` are forwarded automatically.                                                     |
| `memory`                | ❌       | `6G`              | string  | The amount of memory for the virtual machine.                                                                                                                                                                                                                |
| `cpu_count`             | ❌       | `2`               | integer | The number of CPU cores for the virtual machine.                                                                                                                                                                                                             |
| `image_url`             | ❌       | ❌                | string  | URL a custom VM image that should be used in place of the default ones.                                                                                                                                                                                      |
| `sync_files`            | ❌       | `true`            | string  | Specifies if the local files should be synchronized to the virtual machine and in which direction. Valid values are `true`, `false`, `runner-to-vm` and `vm-to-runner`. `true` synchronizes files in both directions. `false` disables file synchronization. |
| `shutdown_vm`           | ❌       | conditional       | boolean | **Deprecated.** Specifies if the VM should be shutdown after the action has been run. If unset, defaults to `true` when `run` is provided and `false` otherwise. There is no replacement.                                                                    |

All inputs are expected to be of the specified type. It's especially important
that you specify `version` as a string, using single or
double quotes. Otherwise YAML might interpet the value as a numeric value
instead of a string, which leads to some unexpected behavior. If the
version is specified as `version: 13.0`, YAML will interpet `13.0` as a
floating point number, drop the fraction part (because `13` and `13.0` are the
same) and the GitHub action will only see `13` instead of `13.0`. The solution
is to explicitly state that a string is required by using quotes: `version:
'13.0'`.

#### Custom VM Image (`image_url`)

With the `image_url` input it's possible to specify a custom virtual machine
image. The main reason for this feature is to do additional custom
provisioning, like installing additional packages. This allows to pre-install
everything that is needed for a CI job beforhand, which can save time later
when the job is run.

Only existing operating systems, architectures and versions are supported.

##### Building a Custom VM Image

1. Fork one of the existing [*builder repositories ](https://github.com/cross-platform-actions/?q=builder)
1. Add the additional provisioning to the `resources/custom.sh` script. Don't
    remove any existing provisioning scripts.
1. Adjust the CI workflow to remove any unwanted architectures or versions
1. Create and push a new tag
1. This will launch the CI workflow, build the image(s) and create a draft
    GitHub release. The VM image(s) are automatically attached to the release
1. Edit the release to publish it
1. Copy the URL for the VM image
1. Use the URL with the `image_url` input

## `Supported Platforms`

This sections lists the currently supported platforms by operating system. Each
operating system will list which versions are supported.

### [OpenBSD][openbsd_builder] (`openbsd`)

| Version | x86-64 | arm64  |
| ------- | ------ | ------ |
| 7.9     | ✅     | ✅     |
| 7.8     | ✅     | ✅     |
| 7.7     | ✅     | ✅     |
| 7.6     | ✅     | ✅     |
| 7.5     | ✅     | ✅     |
| 7.4     | ✅     | ✅     |
| 7.3     | ✅     | ✅     |
| 7.2     | ✅     | ✅     |
| 7.1     | ✅     | ✅     |
| 6.9     | ✅     | ✅     |
| 6.8     | ✅     | ❌     |

### [FreeBSD][freebsd_builder] (`freebsd`)

| Version | x86-64 | arm64  |
| ------- | ------ | ------ |
| 15.1    | ✅     | ✅     |
| 15.0    | ✅     | ✅     |
| 14.4    | ✅     | ✅     |
| 14.3    | ✅     | ✅     |
| 14.2    | ✅     | ✅     |
| 14.1    | ✅     | ✅     |
| 14.0    | ✅     | ✅     |
| 13.5    | ✅     | ✅     |
| 13.4    | ✅     | ✅     |
| 13.3    | ✅     | ✅     |
| 13.2    | ✅     | ✅     |
| 13.1    | ✅     | ✅     |
| 13.0    | ✅     | ✅     |
| 12.4    | ✅     | ✅     |
| 12.2    | ✅     | ❌     |

### [NetBSD][netbsd_builder] (`netbsd`)

| Version | x86-64 | arm64 |
|---------|--------|-------|
| 10.1    | ✅     | ✅    |
| 10.0    | ✅     | ✅    |
| 9.4     | ✅     | ❌    |
| 9.3     | ✅     | ❌    |
| 9.2     | ✅     | ❌    |

### [DragonFly BSD][dragonflybsd_builder] (`dragonflybsd`)

| Version | x86-64 |
|---------|--------|
| 6.4.2   | ✅     |

### [MidnightBSD][midnightbsd_builder] (`midnightbsd`)

| Version | x86-64 |
|---------|--------|
| 4.0.4   | ✅     |

### [Haiku][haiku_builder] (`haiku`)

Note, Haiku is a single user system. That means the user that runs the the job
is the default (and only) user, `user`, instead of `runner`, as for the other
operating systems.

| Version | x86-64 |
|---------|--------|
| r1beta5 | ✅     |

### [OmniOS][omnios_builder] (`omnios`)

| Version | x86-64 |
|---------|--------|
| r151058 | ✅     |
| r151056 | ✅     |

### Architectures

This section lists the supported architectures and any aliases. All the names
are case insensitive. For a combination of supported architectures and
operating systems, see the sections for each operating system above.

| Architecture | Aliases         |
|--------------|-----------------|
| `arm64`      | `aarch64`       |
| `x86-64`     | `x86_64`, `x64` |
|              |                 |

### Hypervisors

This section lists the available hypervisors, which platforms they can run and
which runners they can run on.

| Hypervisor | Linux Runner | FreeBSD | OpenBSD | Other Platforms |
|------------|--------------|---------|---------|-----------------|
| `qemu`     | ✅           | ✅      | ✅      | ✅             |

### Runners

This section lists the different combinations of platforms and on which runners
they can run.

| Runner                                        | OpenBSD | FreeBSD | NetBSD | DragonFly BSD | MidnightBSD | ARM64 |
| ----------------------------------------------| ------- | ------- | ------ | ------------- | ----------- | ----- |
| **Linux**                                     | ✅      | ✅      | ✅     | ✅            | ✅          | ✅   |

## `Linux on Non-x86 Architectures`

There are currently no plans to add support for Linux. Instead it's very easy
to support Linux on non-x86 architectures using the QEMU support in Docker with the
[step-security/setup-qemu-action](https://github.com/step-security/setup-qemu-action) action:

```yaml
- name: Set up QEMU
  uses: step-security/setup-qemu-action@v4
  with:
    platforms: linux/riscv64

- name: Run Command in Docker
  run: |
    docker run \
      --rm \
      -v $(pwd):/${{ github.workspace }} \
      -w ${{ github.workspace }} \
      --platform linux/riscv64 \
      debian:unstable-slim \
      <command to run>
```

For those not familiar with Docker, here's an explanation of the above command:

* `run` - Runs a Docker container
* `--rm` - Removes the container after it exits
* `-v` - Mounts a local directory into the container. In this case the current
    directory is mounted to the same path in the container
* `-w` - Specifies the working directory inside the container
* `--platform` - Specifies the platform/architecture
* `debian:unstable-slim` - Specifies with image to create the container from.
    Basically the Linux distribution to use
* `<command to run>` - The command you want to run inside the container

## `Common Issues`

### FreeBSD Operating System Version Mismatch

#### Issue

When installing packages on FreeBSD you might see an error related to
mismatching of operating system or kernel version. This occurs because FreeBSD
only supports one minor version of the previous major version. Therefore
FreeBSD only has one package repository for each **major** version, not each
**minor** version. When a new minor version is released, all packages in the
repository are rebuilt targeting this new minor version. If you're on an older
minor version of the operating system the package manager will give you an
error.

For more information, see: https://www.freebsd.org/security/#sup and
https://www.freebsd.org/releases.

#### Solution

##### Alternative 1

The best solution is to upgrade to the latest supported minor version.

##### Alternative 2

If Alternative 1 is not possible, you can ignore the operating system version
mismatch by setting the `IGNORE_OSVERSION` environment variable with the value
`yes`. Ignoring the operating system version mismatch can lead to runtime
issues if the package depends on features or libraries only present in the
newer operating system version. Example:

```
env IGNORE_OSVERSION=yes pkg install <package>
```

Where `<package>` is the name of the package to install.

## Security

To report a security vulnerability, follow the guidelines described in the
[`security.md`](./security.md) document.

## `Under the Hood`

GitHub Actions currently only support macOS, Linux, and Windows. To be able to
run other platforms, this GitHub action runs the commands inside a virtual
machine (VM). If the host platform is macOS or Linux the hypervisor can take
advantage of nested virtualization.

All platforms run on the [QEMU][qemu] hypervisor. QEMU is a general purpose
hypervisor and emulator that runs on most host platforms and supports most
guest systems.

The VM images running inside the hypervisor are built using [Packer][packer].
It's a tool for automatically creating VM images, installing the guest
operating system and doing any final provisioning.

The GitHub action uses SSH to communicate and execute commands inside the VM.
It uses [rsync][rsync] to share files between the guest VM and the host. To
authenticate the SSH connection a unique key pair is used. This pair is
generated each time the action is run. The public key is added to the VM image
and the host stores the private key. A secondary hard drive, which is backed by
a file, is created. The public key is stored on this hard drive, which the VM
then mounts. At boot time, the secondary hard drive will be identified and the
public key will be copied to the appropriate location.

To reduce the time it takes for the GitHub action to start executing the
commands specified by the user, it aims to boot the guest operating systems as
fast as possible. This is achieved in a couple of ways:

- By downloading [resources][resources], like the hypervisor and a few other
  tools, instead of installing them through a package manager

- The resources that are downloaded use no compression. The size is
  small enough anyway and it's faster to download the uncompressed data than
  it is to download compressed data and then uncompress it.

- It leverages `async`/`await` to perform tasks asynchronously. Like
  downloading the VM image and other resources at the same time

- It performs as much as possible of the setup ahead of time when the VM image
  is provisioned

[qemu]: https://www.qemu.org
[rsync]: https://en.wikipedia.org/wiki/Rsync
[resources]: https://github.com/cross-platform-actions/resources
[packer]: https://www.packer.io
[openbsd_builder]: https://github.com/cross-platform-actions/openbsd-builder
[freebsd_builder]: https://github.com/cross-platform-actions/freebsd-builder
[netbsd_builder]: https://github.com/cross-platform-actions/netbsd-builder
[haiku_builder]: https://github.com/cross-platform-actions/haiku-builder
[dragonflybsd_builder]: https://github.com/cross-platform-actions/dragonflybsd-builder
[midnightbsd_builder]: https://github.com/cross-platform-actions/midnightbsd-builder
[omnios_builder]: https://github.com/cross-platform-actions/omnios-builder
