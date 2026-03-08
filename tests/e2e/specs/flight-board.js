describe('Flight board', () => {
  it('shows the board shell and supports airport suggestions', () => {
    cy.visit('/')
    cy.contains('h2', 'Load airport')
    cy.get('#airport-code').should('have.value', 'GLA')

    cy.get('#airport-code').type('GL')

    cy.get('.suggestions').within(() => {
      cy.contains('button', 'GLA').should('be.visible')
    })
  })
})
