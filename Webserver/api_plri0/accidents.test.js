const fs = require('fs');
const path = require('path');
const { getAccidentById } = require('./controllers/accidents');


// Mock the required dependencies
jest.mock('fs', () => ({
  readdir: jest.fn(),
  readFile: jest.fn(),
  unlink: jest.fn(),
}));
jest.mock('path', () => ({
  resolve: jest.fn(),
  join: jest.fn(),
}));

/*Testing get accident by id*/


describe('getAccidentById', () => {
  it('should return the accident data when found', (done) => {
    const id = '123';
    const mockFilePath = '/mock/path/to/accident_123.json';
    const mockAccidentData = { id: '123', location: 'Example Location' };

    // Mock the file reading
    fs.readFile.mockImplementation((filePath, encoding, callback) => {
      if (filePath === mockFilePath) {
        callback(null, JSON.stringify(mockAccidentData));
      } else {
        callback(new Error('File not found'));
      }
    });

    // Mock the path resolving
    path.resolve.mockReturnValue(mockFilePath);

    const mockReq = { params: { id } };
    const mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    // Invoke the function
    getAccidentById(mockReq, mockRes);

    // Check assertions
    setTimeout(() => {
      expect(fs.readFile).toHaveBeenCalledWith(mockFilePath, 'utf8', expect.any(Function));
      expect(mockRes.json).toHaveBeenCalledWith(mockAccidentData);
      done();
    });
  });

  it('should return an error message when the accident is not found', (done) => {
    const id = '456';
    const mockFilePath = '/mock/path/to/accident_456.json';

    // Mock the file reading
    fs.readFile.mockImplementation((filePath, encoding, callback) => {
      callback(new Error('File not found'));
    });

    // Mock the path resolving
    path.resolve.mockReturnValue(mockFilePath);

    const mockReq = { params: { id } };
    const mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    // Invoke the function
    getAccidentById(mockReq, mockRes);

    // Check assertions
    setTimeout(() => {
      expect(fs.readFile).toHaveBeenCalledWith(mockFilePath, 'utf8', expect.any(Function));
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Accident not found' });
      done();
    });
  });

  it('should return an error message when failed to parse accident data', (done) => {
    const id = '789';
    const mockFilePath = '/mock/path/to/accident_789.json';

    // Mock the file reading
    fs.readFile.mockImplementation((filePath, encoding, callback) => {
      if (filePath === mockFilePath) {
        callback(null, 'Invalid JSON');
      } else {
        callback(new Error('File not found'));
      }
    });

    // Mock the path resolving
    path.resolve.mockReturnValue(mockFilePath);

    const mockReq = { params: { id } };
    const mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    // Invoke the function
    getAccidentById(mockReq, mockRes);

    // Check assertions
    setTimeout(() => {
      expect(fs.readFile).toHaveBeenCalledWith(mockFilePath, 'utf8', expect.any(Function));
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Failed to parse accident data' });
      done();
    });
  });
});

