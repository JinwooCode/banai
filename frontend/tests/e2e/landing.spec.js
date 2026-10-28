import AxeBuilder from '@axe-core/playwright';
import { expect, test } from './fixtures.js';

test.use({ showLanding: true });

test.describe('opening page', () => {
  test('shows the logo, the slogan and a wardrobe that builds itself, then leads to the start screen', async ({ page }) => {
    await page.goto('/');
    const landing = page.getByTestId('landing');
    await expect(landing.getByRole('img', { name: 'BanAI' })).toBeVisible();
    await expect(landing.getByRole('heading', { level: 1 })).toHaveText('סוף סוף מישהו שמסדר לך את הארון.');
    await expect(landing.locator('.landing__stage canvas')).toBeVisible();
    await expect(page.getByTestId('landing-start')).toBeFocused();
    // The build narrates itself and ends with blueprint measurements of the real design.
    await expect(landing.locator('.landing__chip--done')).toHaveText('הארון מוכן', { timeout: 15000 });
    await expect(landing.locator('.landing__dim-label').first()).toHaveText('W 200 cm');

    await page.getByTestId('landing-start').click();
    await expect(landing).toHaveCount(0);
    await expect(page.getByTestId('start-screen')).toBeVisible();

    await page.reload(); // once per session
    await expect(page.getByTestId('start-screen')).toBeVisible();
    await expect(page.getByTestId('landing')).toHaveCount(0);
  });

  test('the hero is hands-on: door colour swatches and a peek inside', async ({ page }) => {
    await page.goto('/');
    const walnut = page.getByTestId('landing-swatch-walnut');
    await walnut.click();
    await expect(walnut).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByTestId('landing-swatch-natural_oak')).toHaveAttribute('aria-pressed', 'false');
    const peek = page.getByTestId('landing-peek');
    await peek.click();
    await expect(peek).toHaveAttribute('aria-pressed', 'true');
    await expect(peek).toHaveText('סגרו דלתות');
    await peek.click();
    await expect(peek).toHaveText('הציצו פנימה');
  });

  test('"Peek inside" opens the doors even during the automatic first peek', async ({ page }) => {
    await page.goto('/');
    await page.locator('.landing__chip--done').waitFor({ timeout: 15000 });
    await page.waitForTimeout(1200); // the doors are now open on their own
    const peek = page.getByTestId('landing-peek');
    await peek.click();
    await expect(peek).toHaveAttribute('aria-pressed', 'true');
    await expect(peek).toHaveText('סגרו דלתות');
  });

  test('"How it works" and the six templates, drawn from their designs', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('landing-how').click();
    await expect(page.locator('.landing__step')).toHaveCount(3);
    await expect(page.locator('.landing__card')).toHaveCount(6);
    await expect(page.locator('.landing__card .elevation')).toHaveCount(6);
  });

  test('a template card opens the start screen with that template chosen', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('landing-preset-hallway').click();
    await page.getByTestId('auth-guest').click();
    await expect(page.getByTestId('entry-preset')).toHaveValue('hallway');
    await page.getByTestId('entry-basic').click();
    await page.waitForFunction(() => window.__banai?.viewer.meshOf('rail_c1'));
    expect(await page.evaluate(() => window.__banai.store.getState().design.dimensions.width)).toBe(1200);
  });

  test('the opening page has no accessibility violations', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' }); // axe measures settled colours, not fades
    await page.goto('/');
    await expect(page.getByTestId('landing')).toBeVisible();
    const results = await new AxeBuilder({ page }).include('[data-testid="landing"]').analyze();
    expect(results.violations.map((v) => v.id)).toEqual([]);
  });
});
