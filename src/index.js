function getCurrentDateTime() {
    return new Date();
}

export default function ttl() {
    return {
        createExtensions: ({ cacheInstance }) => {
            return {
                touch: (key) => {
                    const extra = cacheInstance.getExtra(key);

                    if (!extra || !extra.ttlData) {
                        return false;
                    }

                    const refreshedTtlData = Object.assign(
                        {},
                        extra.ttlData,
                        { validTill: new Date(getCurrentDateTime().getTime() + extra.ttlData.ttl * 1000) }
                    );
                    const freezedTtlData = Object.freeze(refreshedTtlData);

                    cacheInstance.setExtra(key, { ttlData: freezedTtlData });

                    return refreshedTtlData;
                }
            };
        },
        hooks: [
            {
                event: 'preSetItem',
                handler: ({ cacheInstance, key, value, extra }) => {
                    if (!extra || extra.ttl === undefined) {
                        return { cacheInstance, key, value, extra };
                    }

                    if (!Number.isInteger(extra.ttl)) {
                        throw new Error('`ttl` must be an integer.');
                    }

                    if (extra.ttl <= 0) {
                        throw new Error('`ttl` must be greater than 0.');
                    }

                    const durationInSeconds = extra.ttl;

                    delete extra.ttl;

                    const now = getCurrentDateTime();
                    const ttlData = {
                        ttl: durationInSeconds,
                        created: now,
                        validTill: new Date(now.getTime() + 1000 * durationInSeconds)
                    };
                    const freezedTtlData = Object.freeze(ttlData);
                    const extraWithTtlData = Object.assign({}, extra, { ttlData: freezedTtlData });

                    return { cacheInstance, key, value, extra: extraWithTtlData };
                }
            },
            {
                event: 'postHasItem',
                handler: ({ cacheInstance, key, result }) => {
                    if (!result) {
                        return { cacheInstance, key, result };
                    }

                    const extra = cacheInstance.getExtra(key);

                    if (!extra || !extra.ttlData) {
                        return { cacheInstance, key, result };
                    }

                    const now = getCurrentDateTime();
                    const itemsValidTill = extra.ttlData.validTill;

                    if (now > itemsValidTill) {
                        cacheInstance.removeItem(key);

                        return { cacheInstance, key, result: false };
                    }

                    return { cacheInstance, key, result };
                }
            },
            {
                event: 'postGetItem',
                handler: ({ cacheInstance, key, item }) => {
                    if (!item) {
                        return { cacheInstance, key, item };
                    }

                    if (!item.extra || !item.extra.ttlData) {
                        return { cacheInstance, key, item };
                    }

                    const now = getCurrentDateTime();
                    const itemsValidTill = item.extra.ttlData.validTill;

                    if (now > itemsValidTill) {
                        cacheInstance.removeItem(key);

                        return { cacheInstance, key, item: undefined };
                    }

                    return { cacheInstance, key, item };
                }
            }
        ]
    };
}
