import { timeProvider } from '../src/utils/TimeProvider.js';

console.log('--- TimeProvider Verification ---');

// 1. Initial State
const start = timeProvider.now();
console.log('1. Initial Time:', start.toISOString());

// 2. Jump forward 1 hour (3600000 ms)
console.log('2. Jumping forward 1 hour...');
timeProvider.jumpTime(3600000);

const afterJump = timeProvider.now();
console.log('   New Time:', afterJump.toISOString());

const diff = afterJump.getTime() - start.getTime();
console.log('   Difference (ms):', diff);

if (Math.abs(diff - 3600000) < 1000) { // Allow small execution time diff
    console.log('✅ PASS: Time jumped correctly.');
} else {
    console.error('❌ FAIL: Time jump incorrect.');
}

// 3. Reset
console.log('3. Resetting time...');
timeProvider.resetTime();
const afterReset = timeProvider.now();
console.log('   Reset Time:', afterReset.toISOString());

const realNow = new Date();
const resetDiff = Math.abs(afterReset.getTime() - realNow.getTime());

if (resetDiff < 1000) {
    console.log('✅ PASS: Time reset correctly to near real time.');
} else {
    console.error('❌ FAIL: Time reset incorrect. Diff:', resetDiff);
}

// 4. Test .date() helper
console.log('4. Testing .date() helper...');
const fixedDate = new Date('2023-01-01T00:00:00Z');
const provided = timeProvider.date(fixedDate);
if (provided.getTime() === fixedDate.getTime()) {
    console.log('✅ PASS: .date(value) returns value.');
} else {
    console.error('❌ FAIL: .date(value) failed.');
}

const emptyDate = timeProvider.date();
const now = timeProvider.now();
if (Math.abs(emptyDate.getTime() - now.getTime()) < 10) {
    console.log('✅ PASS: .date() returns simulated now.');
} else {
    console.error('❌ FAIL: .date() failed.');
}
