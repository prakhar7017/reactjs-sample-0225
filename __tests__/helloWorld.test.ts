import { helloWorld } from '../src/helloWorld';

test('hello world!', () => {
	expect(helloWorld()).toBe('Hello, World!');
});