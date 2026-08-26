---
version: 0.1.3
generated: 2026-05-13
---

# Logging specification

## 1. Purpose

Define what is logged and how. Ensure request traceability, audit, performance measurement, and security analysis.

## 2. Scope

- All application components use the same log format.
- The specification applies to every back-end service and server-side request handler.

## 3. Format

- A log record is one JSON object per line (NDJSON), UTF-8 encoding.

## 4. Mandatory fields

| Field     | Type                           | Description                                                    |
| --------- | ------------------------------ | -------------------------------------------------------------- |
| timestamp | string (ISO 8601, UTC)         | When the record was created.                                   |
| level     | enum: DEBUG, INFO, WARN, ERROR | Record severity.                                               |
| requestId | string (UUID v4)               | Unique request ID.                                             |
| service   | string                         | Name of the component emitting the record.                     |
| userId    | string                         | Actor's user ID; for anonymous requests: `anonymous`.          |
| endpoint  | string (`METHOD /path`)        | Target endpoint of the request.                                |
| message   | string                         | Human-readable short summary of the event.                     |

## 5. Request correlation

- `requestId` — UUID created by the first receiving component.
- `receivedRequestId` — value of the incoming HTTP `X-Request-ID` header, if present.
- Every outgoing request carries the same `requestId` in the `X-Request-ID` header.

## 6. Forbidden data

The following must never appear in a log record:

- passwords;
- authentication / session tokens (incl. JWT);
- personal codes;
- other personally or security-sensitive data (health data, biometrics, secret keys, etc.).

## 7. Logged events

| # | Epic | Task | Event description |
|---|------|------|-------------------|
| 11 | User management | User list | Opening the user list is written to the audit log. |
| 12 | User management | User list | The record makes it possible to determine after the fact who viewed the list, when, and in which scope (all organisations or their own organisation). |
| 13 | User management | User list | If the user used the search, only the fact that search was used is recorded — the search term content itself is never written to the audit log (privacy). |
| 13a | User management | User list | Also logged every time a user lacks the required permission (`user.list.admin` OR `user.list.local`) and access is denied (`authz.denied`). |
| 13b | User management | User list | Also logged every time a local-scope user attempts to access another organisation's user list (`authz.scope_violation`). |
| 14 | User management | User create / update | Viewing a user's data (who opened which user detail view). |
| 14a | User management | User create / update | Also logged every time a user lacks the required permission (`user.read.admin` OR `user.read.local`) and access is denied (`authz.denied`). |
| 15 | User management | User create / update | Creating a new user (incl. personal-code hash, organisation identifier). |
| 15a | User management | User create / update | Also logged every time a user lacks the required permission (`user.edit.admin` OR `user.edit.local`) and a create attempt is denied (`authz.denied`). |
| 16 | User management | User create / update | Updating a user's data (incl. list of changed fields). |
| 16a | User management | User create / update | Also logged every time a user lacks the required permission (`user.edit.admin` OR `user.edit.local`) and an update attempt is denied (`authz.denied`). |
| 17 | User management | User create / update | Changing organisation (previous and new organisation identifier, removed user-group list). |
| 17a | User management | User create / update | Also logged every time a local-scope user attempts to change organisation (admin-only action; `authz.scope_violation`). |
| 18 | User management | User create / update | State transitions (state change and its reason). |
| 19 | User management | User create / update | Personal codes are logged only as a hash — cleartext personal codes are never written to the audit log. |
| 20 | User management | Assigning a user group to a user | Adding a user group to a user (list of added group(s)). |
| 21 | User management | Assigning a user group to a user | Removing a user group from a user (name of removed group). |
| 22 | User management | Assigning a user group to a user | Each record includes: actor, time, target user identifier, and identifier(s) of the modified group(s). |
| 22a | User management | Assigning a user group to a user | Also logged every time a user lacks the required permission (`user.edit.admin` OR `user.edit.local`) and an assignment attempt is denied (`authz.denied`). |
| 1 | User management | User group list | Opening the user group list is written to the audit log. |
| 2 | User management | User group list | The record makes it possible to determine after the fact who viewed the list, when, and in which scope (all organisations or their own organisation). |
| 3 | User management | User group list | If the user used the search, only the fact that search was used is recorded, along with the length of the search term — the search term content itself is never written to the audit log (privacy). |
| 3a | User management | User group list | Also logged every time a user lacks the required permission (`user_group.list.admin` OR `user_group.list.local`) and access is denied (`authz.denied`). |
| 4 | User management | User group create | For every successful user-group creation, an audit record is written that makes it possible to determine after the fact who created the new group, when, with which name, with which organisations, and with which permissions. |
| 4a | User management | User group create | Also logged every time a user lacks the required permission (`user_group.create`) and a create attempt is denied (`authz.denied`). |
| 5 | User management | User group create | The **computed (not stored)** "All organisations" flag value is also logged, so it is traceable whether the group was intentionally created system-wide. The flag value is derived as `organisationIds.size == count(organisation)` and stored as the audit label `labels.all_organisations`; no DB column is modified. |
| 6 | User management | User group update | Opening the group detail view (who opened which group). |
| 6a | User management | User group update | Also logged every time a user lacks the required permission (`user_group.read.admin` OR `user_group.read.local`) and access is denied (`authz.denied`). |
| 7 | User management | User group update | Saving an accordion — changing the group name, changing linked organisations (list of added and removed organisations), changing permissions (list of added and removed permissions). |
| 7a | User management | User group update | Also logged every time a user lacks the required permission (`user_group.update`) and an update attempt is denied (`authz.denied`). |
| 8 | User management | User group update | The new value of the **computed (not stored)** "All organisations" flag is also logged, so it is traceable whether the group covers the whole system. The flag is computed at read time from `count(active user_group_organisation) == count(organisation)`; stored as the audit label `labels.all_organisations`, not as a `user_group` column. |
| 9 | User management | User group update | Adding users to a group (list of users added from the modal). |
| 9a | User management | User group update | Also logged every time a user lacks the required permission (`user_group.add_user`) and an add attempt is denied (`authz.denied`). |
| 10 | User management | User group update | Removing a user from a group. |
| 10a | User management | User group update | Also logged every time a user lacks the required permission (`user_group.remove_user`) and a remove attempt is denied (`authz.denied`). |
| 23 | User management | Nightly user-deactivation job | An audit record is written for every deactivated user. |
| 24 | User management | Nightly user-deactivation job | Errors encountered during the run (failed users with error causes) and the run's summary statistics (number of successful and failed deactivations) are also written to the error log. |
| 25 | Classifier management | Classifier list | Every opening of the classifier list is logged. |
| 26 | Classifier management | Classifier list | Also logged every time a user lacks the required permission and access is denied. |
| 27 | Classifier management | Classifier view | Every opening of a classifier's single view is logged. |
| 28 | Classifier management | Classifier view | Also logged every time a user lacks the required permission and access is denied. |
| 29 | Classifier management | Classifier update | Every successful change to a classifier's name and/or description is logged together with the list of changed fields (field names only, not values). |
| 30 | Classifier management | Classifier update | Also logged every time a user lacks the required permission and access is denied. |
| 31 | Classifier management | Classifier value management | Every successful value creation and every successful validity end is logged. |
| 32 | Classifier management | Classifier value management | Also logged every time a user lacks the required permission and access is denied. |
