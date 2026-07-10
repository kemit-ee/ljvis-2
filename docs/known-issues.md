# Known Issues / Teadaolevad probleemid

## Liquibase 5.0.x — changelog file not found

### Issue
Liquibase Docker image versions `5.0.3` (and likely other 5.0.x releases) fail to start with:

```
ChangeLogParseException: /liquibase/changelog.yaml does not exist
ChangeLogParseException: /ljvis/changelog.yaml does not exist
```

even when the changelog file is present via `COPY` in the image or bind-mounted into the container.

### Root cause
Liquibase 5.0.x Docker image uses `/liquibase/` as its own installation/runtime path. The changelog resource loader in 5.0.x does not resolve `changelog.yaml` correctly from `/liquibase/` or any other container path. The `searchPath` property in `liquibase.properties` is also not applied before the changelog file lookup, so neither absolute paths nor custom directories (`/ljvis/`) help.

### Workaround
Use the latest Liquibase 4.x release that is compatible with the project. As of the current deploy setup, the pinned image is:

```dockerfile
FROM liquibase/liquibase:4.29.2
```

With Liquibase 4.29.2, the following configuration works as expected:
- `docker/liquibase/Dockerfile`: `COPY DSL/Liquibase/ /liquibase/`
- `docker-compose.yml` and `docker-compose.ci.yml`: bind-mount `./DSL/Liquibase/` to `/liquibase/`
- `DSL/Liquibase/liquibase.properties`: `changelogFile: changelog.yaml`, `searchPath: /liquibase/`
- Liquibase command: `--defaultsFile=/liquibase/liquibase.properties update`

### Next steps
Re-evaluate Liquibase 5.x compatibility once a newer 5.x release is available or once Liquibase documents the correct way to configure `searchPath`/`changelogFile` in the Docker image. At the time of writing, the 5.0.3 image does not allow a simple changelog file path to work.
