export function StudentCategoryOptions({ value, onChange, collegeClosed, checking, error }) {
  const collegeDisabled = collegeClosed || checking
  return <>
    <div className="radio-options" role="radiogroup" aria-label="Student category" aria-invalid={Boolean(error)}>
      {['School', 'College'].map(category => {
        const disabled = category === 'College' && collegeDisabled
        return <label className={`radio-option${disabled ? ' is-disabled' : ''}`} key={category}>
          <input type="radio" name="participantCategory" value={category} checked={value === category} onChange={onChange} required disabled={disabled} aria-describedby={category === 'College' && collegeDisabled ? 'college-registration-status' : undefined} />
          <span className="radio-option-label">{category}</span>
          <span className="radio-option-check" aria-hidden="true">✓</span>
        </label>
      })}
    </div>
    {collegeDisabled && <p className="field-hint" id="college-registration-status" role="status">{collegeClosed ? 'Registrations concluded for colleges.' : 'Checking college registration availability…'}</p>}
  </>
}
