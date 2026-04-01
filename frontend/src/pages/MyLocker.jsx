import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE } from '../utils/apiConfig';

const MyLocker = () => {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);

  useEffect(() => {
    fetchFiles();
  }, []);

  const fetchFiles = async () => {
    try {
      const response = await axios.get(`${API_BASE}/api/list-materials`);
      setFiles(response.data);
    } catch (error) {
      console.error('Error fetching files:', error);
    }
  };

  const handleFileUpload = async () => {
    if (!selectedFile) return;

    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      setUploading(true);
      await axios.post(`${API_BASE}/api/upload-material`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      setSelectedFile(null);
      fetchFiles();
    } catch (error) {
      console.error('Error uploading file:', error);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">My Locker</h1>

      <div className="mb-4">
        <input
          type="file"
          onChange={(e) => setSelectedFile(e.target.files[0])}
          className="border p-2 rounded"
        />
        <button
          onClick={handleFileUpload}
          disabled={uploading || !selectedFile}
          className="ml-2 px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50"
        >
          {uploading ? 'Uploading...' : 'Upload'}
        </button>
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-2">Uploaded Files</h2>
        <ul className="list-disc pl-5">
          {files.map((file, index) => (
            <li key={index} className="mb-2">
              <a
                href={file.download_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 underline"
              >
                {file.file_name}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default MyLocker;