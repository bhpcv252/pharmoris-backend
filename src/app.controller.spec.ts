import { AppController } from './app.controller';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(() => {
    appController = new AppController();
  });

  describe('root', () => {
    it('should redirect to /api/health', () => {
      const res = { redirect: jest.fn() } as unknown;
      appController.redirectToHealth(res);
      expect(res.redirect).toHaveBeenCalledWith(301, '/api/health');
    });
  });
});
