const { suite, test } = intern.getInterface('tdd');
const { assert } = intern.getPlugin('chai');

suite('3to4', () => {
	test('output', () => {
		assert.isTrue(true);
	});
});
