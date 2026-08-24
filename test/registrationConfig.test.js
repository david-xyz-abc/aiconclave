import assert from 'node:assert/strict'
import test from 'node:test'
import { _test as registrationApiTest } from '../functions/api/register.js'
import { initialPanelForm, validatePanelForm } from '../src/features/registrations/registrationConfig.js'

function validPanelForm(phone) {
  return {
    ...initialPanelForm,
    name: 'Test Participant',
    email: 'participant@example.com',
    phone,
    participantType: 'Student',
    organisation: 'AJCE',
    panelSelection: 'AI in Education',
    informationConfirmed: true,
  }
}

test('panel registration accepts exactly ten local phone digits', () => {
  assert.equal(validatePanelForm(validPanelForm('9876543210')).phone, undefined)
})

test('panel registration rejects short, long, and prefixed phone input', () => {
  for (const phone of ['987654321', '98765432101', '+919876543210']) {
    assert.equal(validatePanelForm(validPanelForm(phone)).phone, 'Enter exactly 10 digits after +91.')
  }
})

test('registration API stores panel phone numbers in canonical +91 format', () => {
  assert.equal(registrationApiTest.normalizeIndianPhone('9876543210'), '+919876543210')
  assert.equal(registrationApiTest.normalizeIndianPhone('+91 98765 43210'), '+919876543210')
  assert.equal(registrationApiTest.normalizeIndianPhone('987654321'), null)
  assert.equal(registrationApiTest.normalizeIndianPhone('+1 9876543210'), null)
})
