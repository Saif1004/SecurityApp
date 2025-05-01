import React, { useState } from 'react';

const AddFaces: React.FC = () => {
  const [name, setName] = useState('');
  const [images, setImages] = useState<FileList | null>(null);
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name || !images || images.length === 0) {
      setMessage('Please provide a name and at least one image.');
      return;
    }

    const formData = new FormData();
    formData.append('name', name);
    for (let i = 0; i < images.length; i++) {
      formData.append('images', images[i]);
    }

    try {
      const res = await fetch('https://cerberus.ngrok.dev/register_face', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (data.status === 'success') {
        setMessage(`✅ ${data.message}`);
      } else {
        setMessage(`❌ ${data.message}`);
      }
    } catch (err) {
      console.error(err);
      setMessage('Error uploading face data.');
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>Register New Face</h2>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Person's Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <br />
        <input
          type="file"
          multiple
          accept="image/*"
          onChange={(e) => setImages(e.target.files)}
          required
        />
        <br />
        <button type="submit">Upload & Train</button>
      </form>
      <p>{message}</p>
    </div>
  );
};

export default AddFaces;
