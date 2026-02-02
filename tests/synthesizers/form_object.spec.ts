import { test } from '@japa/runner'
import { Form } from '../../src/form.js'
import { FormObjectSynth } from '../../src/synthesizers/form_object.js'
import { registerFormClass } from '../../src/features/support_form_objects/constants.js'
import ComponentContext from '../../src/component_context.js'

/**
 * Test Form for synthesizer tests
 */
class SynthTestForm extends Form {
  name: string = ''
  email: string = ''
  age: number = 0
}

// Register for hydration
registerFormClass('SynthTestForm', SynthTestForm as unknown as new () => Form)

test.group('FormObjectSynth', () => {
  test('should match Form instances', ({ assert }) => {
    const form = new SynthTestForm()
    assert.isTrue(FormObjectSynth.match(form))
  })

  test('should not match non-Form objects', ({ assert }) => {
    assert.isFalse(FormObjectSynth.match({}))
    assert.isFalse(FormObjectSynth.match([]))
    assert.isFalse(FormObjectSynth.match('string'))
    assert.isFalse(FormObjectSynth.match(123))
    assert.isFalse(FormObjectSynth.match(null))
  })

  test('should dehydrate form with correct property names and values', async ({ assert }) => {
    const form = new SynthTestForm()
    form.name = 'John Doe'
    form.email = 'john@example.com'
    form.age = 30

    const mockContext = {} as ComponentContext
    const synth = new FormObjectSynth(mockContext, 'form', {} as any)

    const dehydratedChildren: Array<{ name: string; value: any }> = []

    const [data, meta] = await synth.dehydrate(form, async (name: string, value: any) => {
      dehydratedChildren.push({ name, value })
      // Real dehydrateChild returns primitives directly, not as tuple
      return value
    })

    // Verify that dehydrateChild was called with property NAMES, not values
    assert.deepEqual(dehydratedChildren.map((c) => c.name).sort(), ['age', 'email', 'name'])

    // Verify values are correct
    const nameChild = dehydratedChildren.find((c) => c.name === 'name')
    assert.equal(nameChild?.value, 'John Doe')

    const emailChild = dehydratedChildren.find((c) => c.name === 'email')
    assert.equal(emailChild?.value, 'john@example.com')

    const ageChild = dehydratedChildren.find((c) => c.name === 'age')
    assert.equal(ageChild?.value, 30)

    // Verify data structure
    assert.equal(data.name, 'John Doe')
    assert.equal(data.email, 'john@example.com')
    assert.equal(data.age, 30)

    // Verify metadata
    assert.equal(meta.class, 'SynthTestForm')
  })

  test('should hydrate form from data', async ({ assert }) => {
    const mockContext = {} as ComponentContext
    const synth = new FormObjectSynth(mockContext, 'form', {} as any)

    const data = {
      name: 'Jane Doe',
      email: 'jane@example.com',
      age: 25,
    }

    const meta = {
      class: 'SynthTestForm',
    }

    const form = await synth.hydrate(data, meta, async (value: any) => value)

    assert.instanceOf(form, SynthTestForm)
    assert.equal((form as any).name, 'Jane Doe')
    assert.equal((form as any).email, 'jane@example.com')
    assert.equal((form as any).age, 25)
  })

  test('should preserve data through dehydrate/hydrate cycle', async ({ assert }) => {
    const originalForm = new SynthTestForm()
    originalForm.name = 'Test User'
    originalForm.email = 'test@test.com'
    originalForm.age = 42

    const mockContext = {} as ComponentContext
    const synth = new FormObjectSynth(mockContext, 'form', {} as any)

    // Dehydrate - mimics real behavior: primitives are returned as-is
    const [data, meta] = await synth.dehydrate(originalForm, async (name: string, value: any) => {
      // Real dehydrateChild returns primitives directly, not as tuple
      return value
    })

    // Hydrate
    const hydratedForm = await synth.hydrate(data, meta, async (value: any) => value)

    // Verify data is preserved
    assert.equal((hydratedForm as any).name, 'Test User')
    assert.equal((hydratedForm as any).email, 'test@test.com')
    assert.equal((hydratedForm as any).age, 42)
  })

  test('should get property value', ({ assert }) => {
    const form = new SynthTestForm()
    form.name = 'Test'
    form.age = 10

    const mockContext = {} as ComponentContext
    const synth = new FormObjectSynth(mockContext, 'form', {} as any)

    assert.equal(synth.get(form, 'name'), 'Test')
    assert.equal(synth.get(form, 'age'), 10)
    assert.isUndefined(synth.get(form, 'nonexistent'))
  })

  test('should set property value', ({ assert }) => {
    const form = new SynthTestForm()
    form.name = 'Old Name'

    const mockContext = {} as ComponentContext
    const synth = new FormObjectSynth(mockContext, 'form', {} as any)

    synth.set(form, 'name', 'New Name')
    assert.equal(form.name, 'New Name')

    synth.set(form, 'age', 99)
    assert.equal(form.age, 99)
  })

  test('should not set value for non-existent property', ({ assert }) => {
    const form = new SynthTestForm()

    const mockContext = {} as ComponentContext
    const synth = new FormObjectSynth(mockContext, 'form', {} as any)

    synth.set(form, 'nonexistent', 'value')
    assert.isUndefined((form as any).nonexistent)
  })

  test('should throw error when hydrating unknown form class', async ({ assert }) => {
    const mockContext = {} as ComponentContext
    const synth = new FormObjectSynth(mockContext, 'form', {} as any)

    const data = { name: 'Test' }
    const meta = { class: 'UnknownFormClass' }

    await assert.rejects(
      async () => synth.hydrate(data, meta, async (value: any) => value),
      /Form class 'UnknownFormClass' not found/
    )
  })

  test('should throw error when class name is missing from metadata', async ({ assert }) => {
    const mockContext = {} as ComponentContext
    const synth = new FormObjectSynth(mockContext, 'form', {} as any)

    const data = { name: 'Test' }
    const meta = {} // No class name

    await assert.rejects(
      async () => synth.hydrate(data, meta, async (value: any) => value),
      /Form class name not found/
    )
  })
})

/**
 * Tests for wire:model integration with nested form properties
 * These tests ensure that updates like wire:model="form.name" work correctly
 */
test.group('FormObjectSynth - wire:model integration', () => {
  test('synth.set should update form property (simulates wire:model="form.name")', ({ assert }) => {
    const form = new SynthTestForm()
    form.name = 'Old Name'
    form.email = 'old@example.com'
    form.age = 20

    const mockContext = {} as ComponentContext
    const synth = new FormObjectSynth(mockContext, 'form', {} as any)

    // This simulates what happens when wire:model="form.name" sends an update
    // The recursivelySetValue in livewire.ts should call synth.set()
    synth.set(form, 'name', 'New Name')

    assert.equal(form.name, 'New Name')
    // Other properties should remain unchanged
    assert.equal(form.email, 'old@example.com')
    assert.equal(form.age, 20)
  })

  test('synth.get should retrieve form property value', ({ assert }) => {
    const form = new SynthTestForm()
    form.name = 'Test Name'
    form.email = 'test@example.com'
    form.age = 30

    const mockContext = {} as ComponentContext
    const synth = new FormObjectSynth(mockContext, 'form', {} as any)

    // This simulates reading form.name in recursivelySetValue
    assert.equal(synth.get(form, 'name'), 'Test Name')
    assert.equal(synth.get(form, 'email'), 'test@example.com')
    assert.equal(synth.get(form, 'age'), 30)
  })

  test('full wire:model simulation: update nested property and verify in dehydration', async ({
    assert,
  }) => {
    // 1. Create form with initial values (simulates initial page load)
    const form = new SynthTestForm()
    form.name = 'Initial Name'
    form.email = 'initial@example.com'
    form.age = 25

    const mockContext = {} as ComponentContext
    const synth = new FormObjectSynth(mockContext, 'form', {} as any)

    // 2. Simulate wire:model="form.name" update from client
    synth.set(form, 'name', 'Updated Name')

    // 3. Dehydrate the form (simulates response back to client)
    const dehydratedData: Record<string, any> = {}
    await synth.dehydrate(form, async (name: string, value: any) => {
      dehydratedData[name] = value
      // Real dehydrateChild returns primitives directly
      return value
    })

    // 4. Verify the updated value is in the dehydrated data
    assert.equal(dehydratedData.name, 'Updated Name')
    assert.equal(dehydratedData.email, 'initial@example.com')
    assert.equal(dehydratedData.age, 25)
  })

  test('dehydrateChild receives property name as first argument, not value', async ({ assert }) => {
    const form = new SynthTestForm()
    form.name = 'Sauer Inc' // Company name that was appearing as path in the bug
    form.email = 'xavier95@yahoo.com'
    form.age = 42

    const mockContext = {} as ComponentContext
    const synth = new FormObjectSynth(mockContext, 'form', {} as any)

    const calls: Array<{ firstArg: any; secondArg: any }> = []

    await synth.dehydrate(form, async (firstArg: any, secondArg: any) => {
      calls.push({ firstArg, secondArg })
      // Real dehydrateChild returns primitives directly
      return secondArg
    })

    // The bug was: dehydrateChild(value, path) instead of dehydrateChild(name, value)
    // This caused paths like "form.Sauer Inc" instead of "form.name"

    // First argument should ALWAYS be property NAME (string like 'name', 'email', 'age')
    // NOT the value (like 'Sauer Inc', 'xavier95@yahoo.com', 42)
    for (const call of calls) {
      assert.isString(
        call.firstArg,
        `First argument should be property name, got: ${call.firstArg}`
      )
      assert.include(
        ['name', 'email', 'age'],
        call.firstArg,
        `First argument should be a known property name, got: ${call.firstArg}`
      )
    }

    // Verify values are in the second argument
    const nameCall = calls.find((c) => c.firstArg === 'name')
    assert.equal(nameCall?.secondArg, 'Sauer Inc')

    const emailCall = calls.find((c) => c.firstArg === 'email')
    assert.equal(emailCall?.secondArg, 'xavier95@yahoo.com')

    const ageCall = calls.find((c) => c.firstArg === 'age')
    assert.equal(ageCall?.secondArg, 42)
  })
})
