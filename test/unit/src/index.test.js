import { expect } from 'chai';
import sinon from 'sinon';

import createTtlPlugin from '../../../src/index';

const MINUTE_IN_SECONDS = 60;
const KEY = 'key';

function preSetItemPayloadBuilder() {
    const defaultExtra = { ttl: MINUTE_IN_SECONDS };
    const preSetItemPayload = {
        cacheInstance: {},
        key: KEY,
        value: 'value',
        extra: defaultExtra
    };

    return {
        setExtra(extra) {
            preSetItemPayload.extra = extra;

            return this;
        },

        build() {
            return preSetItemPayload;
        }
    }
}

function postHasItemPayloadBuilder() {
    const now = new Date(0);
    const defaultTtlData = {
        ttl: MINUTE_IN_SECONDS,
        created: now,
        validTill: new Date(now.getTime() + 1000 * MINUTE_IN_SECONDS)
    };
    const defaultExtra = { ttlData: defaultTtlData };
    const defaultCacheInstance = {
        getExtra: sinon.stub().withArgs(KEY).returns(defaultExtra),
        removeItem: sinon.spy()
    };
    const postHasItemPayload = {
        cacheInstance: defaultCacheInstance,
        key: KEY,
        result: true
    };

    return {
        setResult(result) {
            postHasItemPayload.result = result;

            return this;
        },

        setTtl(ttl) {
            const ttlData = {
                ttl,
                created: now,
                validTill: new Date(now.getTime() + 1000 * ttl)
            };

            postHasItemPayload.cacheInstance = {
                getExtra: sinon.stub().withArgs(KEY).returns({ ttlData })
            };

            return this;
        },

        setTtlData(ttlData) {
            postHasItemPayload.cacheInstance = {
                getExtra: sinon.stub().withArgs(KEY).returns({ ttlData })
            };

            return this;
        },

        setExtra(extra) {
            postHasItemPayload.cacheInstance = {
                getExtra: sinon.stub().withArgs(KEY).returns(extra)
            };

            return this;
        },

        build() {
            return postHasItemPayload;
        }
    };
}

function postGetItemPayloadBuilder() {
    const now = new Date(0);
    const defaultTtlData = {
        ttl: MINUTE_IN_SECONDS,
        created: now,
        validTill: new Date(now.getTime() + 1000 * MINUTE_IN_SECONDS)
    };
    const defaultExtra = { ttlData: defaultTtlData };
    const defaultItem = { extra: defaultExtra };
    const defaultCacheInstance = { removeItem: sinon.spy() };
    const postGetItemPayload = {
        cacheInstance: defaultCacheInstance,
        key: KEY,
        item: defaultItem
    };

    return {
        setItem(item) {
            postGetItemPayload.item = item;

            return this;
        },

        setExtra(extra) {
            postGetItemPayload.item = { extra };

            return this;
        },

        build() {
            return postGetItemPayload;
        }
    };
}

function expectPayloadIsReturnedUnchanged(returnedData, handlersPayload) {
    const payloadKeys = Object.keys(handlersPayload);
    const expectedData = {};

    payloadKeys.forEach((payloadKey) => {
        expectedData[payloadKey] = handlersPayload[payloadKey];

        expect(returnedData[payloadKey]).to.equal(expectedData[payloadKey]);
    });

    expect(returnedData).to.deep.equal(expectedData);
}

describe('Ttl plugin', () => {
    describe('createExtensions', () => {
        it('should be a function', () => {
            const plugin = createTtlPlugin();

            expect(plugin.createExtensions).to.be.a('function');
        });

        it('should return an object', () => {
            const plugin = createTtlPlugin();
            const extensions = plugin.createExtensions({ cacheInstance: {} });

            expect(extensions).to.be.an('object');
        });

        describe('touch method', () => {
            beforeEach(function() {
                this.clock = sinon.useFakeTimers();
            });

            afterEach(function() {
                this.clock.restore();
            });

            function buildExtra(dateObject) {
                return {
                    ttlData: {
                        ttl: MINUTE_IN_SECONDS,
                        created: dateObject,
                        validTill: new Date(dateObject.getTime() + 1000 * MINUTE_IN_SECONDS)
                    }
                };
            }

            function buildCacheInstanceDouble(extra = {}) {
                return {
                    getExtra: sinon.stub().withArgs(KEY).returns(extra),
                    setExtra: sinon.spy()
                };
            }

            function buildExtensions(cacheInstance) {
                return createTtlPlugin().createExtensions({ cacheInstance });
            }

            it('should be a function', () => {
                const plugin = createTtlPlugin();
                const extensions = plugin.createExtensions({ cacheInstance: {} });

                expect(extensions.touch).to.be.a('function');
            });

            it(`should renew item's valid till time by ttl value`, function() {
                const now = new Date();
                const extra = buildExtra(now);
                const cacheInstanceDouble = buildCacheInstanceDouble(extra);
                const extensions = buildExtensions(cacheInstanceDouble);
                const thirtySecondsInMilliseconds = 30 * 1000;

                this.clock.tick(thirtySecondsInMilliseconds);

                extensions.touch(KEY);

                const expectedTtlData = {
                    ttl: MINUTE_IN_SECONDS,
                    created: now,
                    validTill: new Date(now.getTime() + 1000 * MINUTE_IN_SECONDS + thirtySecondsInMilliseconds)
                };

                expect(cacheInstanceDouble.setExtra)
                    .to.have.been.calledWithExactly(KEY, { ttlData: expectedTtlData })
                    .to.have.been.calledOnce;
            });

            it('should return ttl data upon successful ttl renewal', function() {
                const now = new Date();
                const extra = buildExtra(now);
                const cacheInstanceDouble = buildCacheInstanceDouble(extra);
                const extensions = buildExtensions(cacheInstanceDouble);
                const thirtySecondsInMilliseconds = 30 * 1000;

                this.clock.tick(thirtySecondsInMilliseconds);

                const returnedTtlData = extensions.touch(KEY);
                const expectedTtlData = {
                    ttl: MINUTE_IN_SECONDS,
                    created: now,
                    validTill: new Date(now.getTime() + 1000 * MINUTE_IN_SECONDS + thirtySecondsInMilliseconds)
                };

                expect(returnedTtlData).to.deep.equal(expectedTtlData);
            });

            it('should freeze the ttl data', function() {
                const now = new Date();
                const extra = buildExtra(now);
                const cacheInstanceDouble = buildCacheInstanceDouble(extra);
                const extensions = buildExtensions(cacheInstanceDouble);
                const thirtySecondsInMilliseconds = 30 * 1000;

                this.clock.tick(thirtySecondsInMilliseconds);

                const returnedTtlData = extensions.touch(KEY);
                const validTillDate = new Date(now.getTime() + 1000 * MINUTE_IN_SECONDS + thirtySecondsInMilliseconds);

                try {
                    delete returnedTtlData.ttl;
                } catch(e) {}

                try {
                    delete returnedTtlData.created;
                } catch(e) {}

                try {
                    delete returnedTtlData.validTill;
                } catch(e) {}

                expect(returnedTtlData.ttl).to.equal(MINUTE_IN_SECONDS);
                expect(returnedTtlData.created.getTime()).to.equal(now.getTime());
                expect(returnedTtlData.validTill.getTime()).to.equal(validTillDate.getTime());
            });

            context(`when there is no extra for given item`, () => {
                it('should return false', () => {
                    const cacheInstanceDouble = buildCacheInstanceDouble();

                    cacheInstanceDouble.getExtra.returns(undefined);

                    const extensions = buildExtensions(cacheInstanceDouble);

                    expect(extensions.touch(KEY)).to.equal(false);
                });
            });

            context(`when extra doesn't contain ttl data`, () => {
                it('should return false', () => {
                    const cacheInstanceDouble = buildCacheInstanceDouble();

                    cacheInstanceDouble.getExtra.returns({});

                    const extensions = buildExtensions(cacheInstanceDouble);

                    expect(extensions.touch(KEY)).to.equal(false);
                });
            });
        });
    });

    describe('hooks', () => {
        let plugin;
        let preSetItemHook;
        let postHasItemHook;
        let postGetItemHook;

        beforeEach(function() {
            plugin = createTtlPlugin();
            preSetItemHook = plugin.hooks[0];
            postHasItemHook = plugin.hooks[1];
            postGetItemHook = plugin.hooks[2];

            this.clock = sinon.useFakeTimers();
        });

        afterEach(function() {
            this.clock.restore();
        });

        it('should be an array', () => {
            expect(plugin.hooks).to.be.an('array');
        });

        describe('preSetItem hook', () => {
            it('should have event name present', () => {
                expect(preSetItemHook.event).to.equal('preSetItem');
            });

            describe('handler', () => {
                context('when extra is not defined', () => {
                    it('should return handlers payload as is', () => {
                        const handlersPayload = preSetItemPayloadBuilder().setExtra(undefined).build();
                        const returnedData = preSetItemHook.handler(handlersPayload);

                        expectPayloadIsReturnedUnchanged(returnedData, handlersPayload);
                    });
                });

                context('when ttl is not set in extra (no ttl === never expires)', () => {
                    it('should return handlers payload as is', () => {
                        const extra = {};
                        const handlersPayload = preSetItemPayloadBuilder().setExtra(extra).build();
                        const returnedData = preSetItemHook.handler(handlersPayload);

                        expectPayloadIsReturnedUnchanged(returnedData, handlersPayload);
                    });
                });

                context('when ttl, set in extra, is not an integer', () => {
                    it('should throw', () => {
                        const notAnInteger = 'someString';
                        const extra = { ttl: notAnInteger };
                        const payload = preSetItemPayloadBuilder().setExtra(extra).build();

                        expect(preSetItemHook.handler.bind(null, payload))
                            .to.throw('`ttl` must be an integer.');
                    });
                });

                context('when ttl, set in extra, has incorrect value', () => {
                    it('should throw', () => {
                        const extra = { ttl: 0 };
                        const payload = preSetItemPayloadBuilder().setExtra(extra).build();

                        expect(preSetItemHook.handler.bind(null, payload))
                            .to.throw('`ttl` must be greater than 0.');
                    });
                });

                it('should remove ttl from extra', function() {
                    const payload = preSetItemPayloadBuilder().build();
                    const result = preSetItemHook.handler(payload);

                    expect(result.extra.ttl).to.be.an('undefined');
                });

                it('should set ttl data in extra based on passed ttl value', function() {
                    const now = new Date();
                    const payload = preSetItemPayloadBuilder().build();
                    const result = preSetItemHook.handler(payload);
                    const ttlData = result.extra.ttlData;
                    const expectedTtlData = {
                        ttl: MINUTE_IN_SECONDS,
                        created: now,
                        validTill: new Date(now.getTime() + 1000 * MINUTE_IN_SECONDS)
                    };

                    expect(ttlData.ttl).to.equal(expectedTtlData.ttl);
                    expect(ttlData.created.getTime()).to.equal(expectedTtlData.created.getTime());
                    expect(ttlData.validTill.getTime()).to.equal(expectedTtlData.validTill.getTime());
                });

                it('should freeze ttl data', function() {
                    const now = new Date();
                    const payload = preSetItemPayloadBuilder().build();
                    const result = preSetItemHook.handler(payload);
                    const ttlData = result.extra.ttlData;
                    const validTillDate = new Date(now.getTime() + 1000 * MINUTE_IN_SECONDS);

                    try {
                        delete ttlData.ttl;
                    } catch(e) {}

                    try {
                        delete ttlData.created;
                    } catch(e) {}

                    try {
                        delete ttlData.validTill;
                    } catch(e) {}

                    expect(ttlData.ttl).to.equal(MINUTE_IN_SECONDS);
                    expect(ttlData.created.getTime()).to.equal(now.getTime());
                    expect(ttlData.validTill.getTime()).to.equal(validTillDate.getTime());
                });
            });
        });

        describe('postHasItem hook', () => {
            it('should have event name present', () => {
                expect(postHasItemHook.event).to.equal('postHasItem');
            });

            describe('handler', () => {
                context('when item is not found in cache', () => {
                    it('should return handlers payload as is', () => {
                        const itemNotFound = false;
                        const postHasItemPayload = postHasItemPayloadBuilder().setResult(itemNotFound).build();
                        const returnedData = postHasItemHook.handler(postHasItemPayload);

                        expectPayloadIsReturnedUnchanged(returnedData, postHasItemPayload);
                    });
                });

                context('when extra is not available', () => {
                    it('should return handlers payload as is', () => {
                        const postHasItemPayload = postHasItemPayloadBuilder().setExtra(undefined).build();
                        const returnedData = postHasItemHook.handler(postHasItemPayload);

                        expectPayloadIsReturnedUnchanged(returnedData, postHasItemPayload);
                    });
                });

                context('when ttlData is not present in extra', () => {
                    it('should return handlers payload as is', () => {
                        const postHasItemPayload = postHasItemPayloadBuilder().setExtra({}).build();
                        const returnedData = postHasItemHook.handler(postHasItemPayload);

                        expectPayloadIsReturnedUnchanged(returnedData, postHasItemPayload);
                    });
                });

                context(`when item's ttl has ended`, () => {
                    const oneMillisecondLaterThanTtl = MINUTE_IN_SECONDS * 1000 + 1;

                    it('should return data with info (result) that item is not present', function() {
                        const postHasItemPayload = postHasItemPayloadBuilder().build();

                        this.clock.tick(oneMillisecondLaterThanTtl);

                        const returnedData = postHasItemHook.handler(postHasItemPayload);
                        const expectedData = {
                            cacheInstance: postHasItemPayload.cacheInstance,
                            key: postHasItemPayload.key,
                            result: false
                        };

                        expect(returnedData).to.deep.equal(expectedData);

                        expect(returnedData.cacheInstance).to.equal(expectedData.cacheInstance);
                        expect(returnedData.key).to.equal(expectedData.key);
                        expect(returnedData.result).to.equal(expectedData.result);
                    });

                    it('should trigger removing that item', function() {
                        const postHasItemPayload = postHasItemPayloadBuilder().build();

                        this.clock.tick(oneMillisecondLaterThanTtl);

                        postHasItemHook.handler(postHasItemPayload);

                        expect(postHasItemPayload.cacheInstance.removeItem)
                            .to.have.been.calledWithExactly(KEY)
                            .to.have.been.calledOnce;
                    });
                });

                context(`when item's ttl has NOT ended`, () => {
                    it('should return handlers payload as is', function() {
                        const ttlTimeInMilliseconds = MINUTE_IN_SECONDS * 1000;
                        const postHasItemPayload = postHasItemPayloadBuilder().build();

                        this.clock.tick(ttlTimeInMilliseconds);

                        const returnedData = postHasItemHook.handler(postHasItemPayload);

                        expectPayloadIsReturnedUnchanged(returnedData, postHasItemPayload);
                    });
                });
            });
        });

        describe('postGetItem hook', () => {
            it('should have event name present', () => {
                expect(postGetItemHook.event).to.equal('postGetItem');
            });

            describe('handler', () => {
                context('when item is not found in cache', () => {
                    it('should return handlers payload as is', () => {
                        const postGetItemPayload = postGetItemPayloadBuilder().setItem(undefined).build();
                        const returnedData = postGetItemHook.handler(postGetItemPayload);

                        expectPayloadIsReturnedUnchanged(returnedData, postGetItemPayload);
                    });
                });

                context('when extra is not present in item', () => {
                    it('should return handlers payload as is', () => {
                        const itemWithoutExtra = {};
                        const postGetItemPayload = postGetItemPayloadBuilder().setItem(itemWithoutExtra).build();
                        const returnedData = postGetItemHook.handler(postGetItemPayload);

                        expectPayloadIsReturnedUnchanged(returnedData, postGetItemPayload);
                    });
                });

                context('when ttl data is not present in extra', () => {
                    it('should return handlers payload as is', () => {
                        const extraWithoutTtlData = {};
                        const postGetItemPayload = postGetItemPayloadBuilder().setExtra(extraWithoutTtlData).build();
                        const returnedData = postGetItemHook.handler(postGetItemPayload);

                        expectPayloadIsReturnedUnchanged(returnedData, postGetItemPayload);
                    });
                });

                context(`when item's ttl has ended`, () => {
                    const oneMillisecondLaterThanSetTtl = MINUTE_IN_SECONDS * 1000 + 1;

                    it('should return data with `item` not present in it', function() {
                        const postGetItemPayload = postGetItemPayloadBuilder().build();

                        this.clock.tick(oneMillisecondLaterThanSetTtl);

                        const returnedData = postGetItemHook.handler(postGetItemPayload);
                        const expectedData = {
                            cacheInstance: postGetItemPayload.cacheInstance,
                            key: postGetItemPayload.key,
                            item: undefined
                        };

                        expect(returnedData).to.deep.equal(expectedData);

                        expect(returnedData.cacheInstance).to.equal(expectedData.cacheInstance);
                        expect(returnedData.key).to.equal(expectedData.key);
                        expect(returnedData.item).to.equal(expectedData.item);
                    });

                    it('should trigger removing that item', function() {
                        const postGetItemPayload = postGetItemPayloadBuilder().build();

                        this.clock.tick(oneMillisecondLaterThanSetTtl);

                        postGetItemHook.handler(postGetItemPayload);

                        expect(postGetItemPayload.cacheInstance.removeItem)
                            .to.have.been.calledWithExactly(KEY)
                            .to.have.been.calledOnce;
                    });
                });

                context(`when item's ttl has NOT ended`, () => {
                    it('should return handlers payload as is', function() {
                        const ttlTimeInMilliseconds = MINUTE_IN_SECONDS * 1000;
                        const postGetItemPayload = postGetItemPayloadBuilder().build();

                        this.clock.tick(ttlTimeInMilliseconds);

                        const returnedData = postGetItemHook.handler(postGetItemPayload);

                        expectPayloadIsReturnedUnchanged(returnedData, postGetItemPayload);
                    });
                });
            });
        });
    });
});
