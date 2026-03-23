----
title: Upgrading NixOS Without Internet
modified: 2026-02-01
meta_description: "Upgrading NixOS on an airgapped system."
tags: NixOS
prerequisites: Nix
----

I recently moved to an apartment without Ethernet. My homelab server 
does not have a wifi card. I bought a usb wifi card, but I needed to install
the drivers.

Here's how I upgrade an airgapped NixOS system.

<!--more-->

## Prerequisites

If you're installing kernel modules you'll need a `NixOS` system with internet 
connection. Otherwise you only need another computer with `Nix` and internet.

## Installing

1. Build your system

    ```bash
    sudo nixos-rebuild build --flake .#<flake-name>
    ```
   - Make sure you have the same kernel version

    ```bash
    readlink /run/current-system/kernel
    ```

    ```bash
    readlink /run/booted-system/kernel
    ```
2. Extract prerequisites to NAR

    ```bash
    nix-store --export \ 
     $(nix-store --query --requisites $(realpath result)) \ 
     > nixos-system.nar
    ```
3. Move NAR to airgapped NixOS
   - Compress

       ```bash
       xz --verbose nixos-system.nar
       ```
   - Sync and watch dirty page writes

       ```bash
       watch -d grep -e Dirty: -e Writeback: /proc/meminfo
       ```
   - Uncompress

       ```bash
       unxz --verbose nixos-system.nar
       ```
4. Update nix vars and reboot

    ```bash
    TODO get commands from zylphia
    ```

My nixconfig is [here](https://github.com/HarrisonCentner/nixconfig). 

