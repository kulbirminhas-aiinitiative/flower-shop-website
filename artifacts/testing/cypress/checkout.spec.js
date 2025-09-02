// E2E Test - Complete Checkout Flow
describe('Checkout Process', () => {
  beforeEach(() => {
    cy.visit('http://localhost:3000');
    cy.clearLocalStorage();
  });

  it('should complete full checkout process', () => {
    // Add products to cart
    cy.get('[data-testid="product-card"]').first().within(() => {
      cy.get('[data-testid="add-to-cart"]').click();
    });
    
    cy.get('[data-testid="cart-count"]').should('contain', '1');
    
    // Go to cart
    cy.get('[data-testid="cart-icon"]').click();
    cy.url().should('include', '/cart');
    
    // Verify cart contents
    cy.get('[data-testid="cart-item"]').should('have.length', 1);
    
    // Proceed to checkout
    cy.get('[data-testid="checkout-button"]').click();
    
    // Fill shipping information
    cy.get('#firstName').type('John');
    cy.get('#lastName').type('Doe');
    cy.get('#email').type('john.doe@test.com');
    cy.get('#phone').type('555-0123');
    cy.get('#address').type('123 Flower St');
    cy.get('#city').type('Garden City');
    cy.get('#state').select('CA');
    cy.get('#zipCode').type('90210');
    
    // Select delivery date
    cy.get('[data-testid="delivery-date"]').click();
    cy.get('[data-testid="date-tomorrow"]').click();
    cy.get('[data-testid="delivery-time"]').select('10:00 AM - 12:00 PM');
    
    // Add special instructions
    cy.get('#specialInstructions').type('Please ring doorbell twice');
    
    // Continue to payment
    cy.get('[data-testid="continue-to-payment"]').click();
    
    // Fill payment information (using Stripe test card)
    cy.get('iframe[name*="stripe"]').then($iframe => {
      const $body = $iframe.contents().find('body');
      cy.wrap($body)
        .find('input[name="cardnumber"]')
        .type('4242424242424242');
      cy.wrap($body)
        .find('input[name="exp-date"]')
        .type('1225');
      cy.wrap($body)
        .find('input[name="cvc"]')
        .type('123');
    });
    
    // Review order
    cy.get('[data-testid="review-order"]').click();
    
    // Verify order summary
    cy.get('[data-testid="order-summary"]').within(() => {
      cy.get('[data-testid="subtotal"]').should('exist');
      cy.get('[data-testid="tax"]').should('exist');
      cy.get('[data-testid="shipping"]').should('exist');
      cy.get('[data-testid="total"]').should('exist');
    });
    
    // Place order
    cy.get('[data-testid="place-order"]').click();
    
    // Verify order confirmation
    cy.url().should('include', '/order-confirmation');
    cy.get('[data-testid="order-number"]').should('exist');
    cy.get('[data-testid="confirmation-message"]')
      .should('contain', 'Your order has been placed successfully');
    
    // Check email was sent (mock verification)
    cy.get('[data-testid="email-sent-indicator"]').should('be.visible');
  });

  it('should handle payment failure gracefully', () => {
    // Add product and go to checkout
    cy.get('[data-testid="product-card"]').first().within(() => {
      cy.get('[data-testid="add-to-cart"]').click();
    });
    cy.get('[data-testid="cart-icon"]').click();
    cy.get('[data-testid="checkout-button"]').click();
    
    // Fill minimum required fields
    cy.get('#email').type('test@test.com');
    cy.get('[data-testid="continue-to-payment"]').click();
    
    // Use card that triggers decline
    cy.get('iframe[name*="stripe"]').then($iframe => {
      const $body = $iframe.contents().find('body');
      cy.wrap($body)
        .find('input[name="cardnumber"]')
        .type('4000000000000002'); // Declined card
    });
    
    cy.get('[data-testid="place-order"]').click();
    
    // Verify error handling
    cy.get('[data-testid="payment-error"]')
      .should('be.visible')
      .and('contain', 'Payment failed');
    
    // User should stay on payment page
    cy.url().should('include', '/checkout/payment');
  });
});