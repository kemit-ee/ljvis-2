#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."

# Set JAVA_TEST_OUTPUT_DIR to retain compiled classes for a coverage report.
if [[ -n "${JAVA_TEST_OUTPUT_DIR:-}" ]]; then
  output_dir="${JAVA_TEST_OUTPUT_DIR}"
  mkdir -p "${output_dir}/classes" "${output_dir}/test-classes"
  if [[ -n "$(ls -A "${output_dir}/classes")$(ls -A "${output_dir}/test-classes")" ]]; then
    echo "ERROR: compiled class directories must be empty" >&2
    exit 1
  fi
else
  output_dir=$(mktemp -d)
  trap 'rm -rf "${output_dir}"' EXIT
  mkdir -p "${output_dir}/classes" "${output_dir}/test-classes"
fi

jdbc=docker/erru-xml-adapter-old/lib/postgresql-42.7.4.jar
javac -g -classpath "${jdbc}" -d "${output_dir}/classes" docker/erru-xml-adapter-old/src/*.java
javac -g -classpath "${output_dir}/classes" -d "${output_dir}/test-classes" tests/erru-adapter/*Test.java
java_args=(-ea)
if [[ -n "${JACOCO_AGENT:-}" ]]; then
  : "${JACOCO_EXEC:?Set JACOCO_EXEC to the execution-data output file}"
  java_args+=("-javaagent:${JACOCO_AGENT}=destfile=${JACOCO_EXEC},append=true")
fi
for suite in MapperSmokeTest ConfigTest CodecBoundaryTest IngressBoundaryTest RsiSendTest CgrCtudSendTest NcrNuSendTest; do
  java "${java_args[@]}" -classpath "${output_dir}/classes:${output_dir}/test-classes:${jdbc}" "${suite}"
done
