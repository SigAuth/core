#!/usr/bin/env bash
# Post-generation script to fix Prisma 7 TypeScript type portability errors (TS2742)
#
# This script adds explicit type annotations to generated Prisma files to avoid
# TypeScript inferring types from pnpm's .pnpm/ directory paths, which are
# considered non-portable.
#
# Issue: Chefy-upgrade-prisma-a1j

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
GENERATED_DIR="$SCRIPT_DIR/../src/prisma-generated/internal"

echo "Fixing Prisma type portability errors..."
echo

# Function to patch a file
patch_file() {
    local file=$1
    local filepath="$GENERATED_DIR/$file"

    if [ ! -f "$filepath" ]; then
        echo "  ✗ File not found: $file"
        return 1
    fi

    echo "Patching $file..."

    # Use sd (modern sed replacement) if available, otherwise fall back to sed
    if command -v sd &> /dev/null; then
        # Add type annotations to DbNull, JsonNull, AnyNull exports
        sd '^export const DbNull = runtime\.DbNull$' \
           'export const DbNull: typeof runtime.DbNull = runtime.DbNull' \
           "$filepath"

        sd '^export const JsonNull = runtime\.JsonNull$' \
           'export const JsonNull: typeof runtime.JsonNull = runtime.JsonNull' \
           "$filepath"

        sd '^export const AnyNull = runtime\.AnyNull$' \
           'export const AnyNull: typeof runtime.AnyNull = runtime.AnyNull' \
           "$filepath"

        # Add type annotations to enum-like objects
        sd '^export const NullableJsonNullValueInput = \{$' \
           'export const NullableJsonNullValueInput: { DbNull: typeof runtime.DbNull, JsonNull: typeof runtime.JsonNull } = {' \
           "$filepath"

        sd '^export const JsonNullValueInput = \{$' \
           'export const JsonNullValueInput: { JsonNull: typeof runtime.JsonNull } = {' \
           "$filepath"

        sd '^export const JsonNullValueFilter = \{$' \
           'export const JsonNullValueFilter: { DbNull: typeof runtime.DbNull, JsonNull: typeof runtime.JsonNull, AnyNull: typeof runtime.AnyNull } = {' \
           "$filepath"
    else
        # Fallback to sed with -i flag (works on both macOS and Linux)
        if [[ "$OSTYPE" == "darwin"* ]]; then
            # macOS requires empty string after -i
            sed -i '' \
                -e 's/^export const DbNull = runtime\.DbNull$/export const DbNull: typeof runtime.DbNull = runtime.DbNull/' \
                -e 's/^export const JsonNull = runtime\.JsonNull$/export const JsonNull: typeof runtime.JsonNull = runtime.JsonNull/' \
                -e 's/^export const AnyNull = runtime\.AnyNull$/export const AnyNull: typeof runtime.AnyNull = runtime.AnyNull/' \
                -e 's/^export const NullableJsonNullValueInput = {$/export const NullableJsonNullValueInput: { DbNull: typeof runtime.DbNull, JsonNull: typeof runtime.JsonNull } = {/' \
                -e 's/^export const JsonNullValueInput = {$/export const JsonNullValueInput: { JsonNull: typeof runtime.JsonNull } = {/' \
                -e 's/^export const JsonNullValueFilter = {$/export const JsonNullValueFilter: { DbNull: typeof runtime.DbNull, JsonNull: typeof runtime.JsonNull, AnyNull: typeof runtime.AnyNull } = {/' \
                "$filepath"
        else
            # Linux doesn't need empty string
            sed -i \
                -e 's/^export const DbNull = runtime\.DbNull$/export const DbNull: typeof runtime.DbNull = runtime.DbNull/' \
                -e 's/^export const JsonNull = runtime\.JsonNull$/export const JsonNull: typeof runtime.JsonNull = runtime.JsonNull/' \
                -e 's/^export const AnyNull = runtime\.AnyNull$/export const AnyNull: typeof runtime.AnyNull = runtime.AnyNull/' \
                -e 's/^export const NullableJsonNullValueInput = {$/export const NullableJsonNullValueInput: { DbNull: typeof runtime.DbNull, JsonNull: typeof runtime.JsonNull } = {/' \
                -e 's/^export const JsonNullValueInput = {$/export const JsonNullValueInput: { JsonNull: typeof runtime.JsonNull } = {/' \
                -e 's/^export const JsonNullValueFilter = {$/export const JsonNullValueFilter: { DbNull: typeof runtime.DbNull, JsonNull: typeof runtime.JsonNull, AnyNull: typeof runtime.AnyNull } = {/' \
                "$filepath"
        fi
    fi

    echo "  ✓ Patched $file"
}

# Patch the files
patch_file "prismaNamespace.ts"
patch_file "prismaNamespaceBrowser.ts"

echo
echo "✓ All patches applied successfully!"