# Ansible inventory data

> **Scope correction — 2026-09-12.** Version 0.1.0 shipped an Ansible playbook, the `azurelocal_terraform` role, a Python module and a Linux CI job that executed them. They were removed in 0.2.0. The configurator emits inventory data for your existing Ansible automation and ships no playbooks, roles or modules.

## What is exported

When the Terraform/Ansible route is selected, an independent external Linux controller is chosen and Terraform input values are available, private designs export `inputs/ansible/`:

| File | Content |
|---|---|
| `inventory.yml` | `azurelocal_control` group holding the selected controller record; `azurelocal_design_nodes` group holding each active node as a design record (`azl_design_only: true`) with its name, management IP and Arc ID. No connection credentials. |
| `group_vars/all.yml` | Project ID and revision, identity mode, runtime credential reference and authentication design; `azl_execution_authorized: false` and `azl_runtime_qualified: false` |
| `contracts/<identity>.parameters.schema.json` | JSON Schema for the ARM parameters this design produces |
| `README.md` | What the files contain and which stages they do not cover |

User-entered strings are tagged `!unsafe` so Ansible treats them as literal data, never as templates.

## What withholds the inventory

A manual-operator bootstrap, a Windows control node, a missing controller record, a sanitized design, or any condition that withholds Terraform input values.

## Not included

No playbooks, roles, modules, or collection and Python requirement locks.

Tests: `src/ansible.test.ts` and `src/configurationPackage.test.ts`.
