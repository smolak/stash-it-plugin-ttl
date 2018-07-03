![logo-stash-it-color-dark 2x](https://user-images.githubusercontent.com/1819138/30385483-99fd209c-98a7-11e7-85e2-595791d8d894.png)

# stash-it-plugin-ttl

[![build status](https://img.shields.io/travis/smolak/stash-it-plugin-ttl/master.svg?style=flat-square)](https://travis-ci.org/smolak/stash-it-plugin-ttl)
[![Coverage Status](https://coveralls.io/repos/github/smolak/stash-it-plugin-ttl/badge.svg?branch=master)](https://coveralls.io/github/smolak/stash-it-plugin-ttl)


TTL plugin for [stash-it](https://www.npmjs.com/package/stash-it).

## Installation

```sh
npm i stash-it-plugin-ttl --save
```

## Usage

```javascript
import { createCache } from 'stash-it';
import createTtlPlugin from 'stash-it-plugin-ttl';

// You can use any adapter
import createMemoryAdapter from 'stash-it-adapter-memory';

const cache = createCache(createMemoryAdapter());
const ttlPlugin = createTtlPlugin();

const cacheWithPlugin = cache.registerPlugins([ ttlPlugin ]);

// Store item with `ttl` in `extra`
const oneHourInSeconds = 3600;
cacheWithPlugin.setItem('key', 'value', { ttl: oneHourInSeconds });

cacheWithPlugin.hasItem('key'); // true

// ... one hour has passed

cacheWithPlugin.hasItem('key'); // false
```

**Heads up**: `ttl` is being moved from `extra`'s top level structure,
so that it is only available in `ttlData`.

## Invalidation of cache

Plugin will invalidate (remove) the item, if ttl has ended, upon:
 - checking if item exists using `hasItem`
 - getting the item using `getItem`

## ttlData structure

```javascript
ttlData = {
   ttl: durationInSeconds,
   created: dateTime,
   validTill: dateTime
}
```

**Important**: ttlData is immutable (using [Object.freeze](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/freeze)).

## touch(key)

This is an additional method, that the plugin will add to cache instance.
Using it, on a given item, represented by its `key`, will refresh the
`validTill` property in `ttlData` stored in `extra` of that item.

Returns `ttlData` with updated `validTill` value.

If you try to `touch` an item that does not exist, this method will
return `false`.

### Example (using the cacheWithPlugin from above):

```javascript
// let's store the item again
cacheWithPlugin.setItem('key', 'value', { ttl: oneHourInSeconds });

cacheWithPlugin.hasItem('key'); // true

// 59 minutes have passed

cacheWithPlugin.touch('key');

// 2 minutes have passed (61 in total)

cacheWithPlugin.hasItem('key'); // true
```
