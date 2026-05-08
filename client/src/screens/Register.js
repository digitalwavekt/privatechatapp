import React, { useState, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaEnvelope, FaLock, FaUser, FaPhone, FaCamera, FaRedo } from 'react-icons/fa';
import Webcam from 'react-webcam';
import api from '../utils/api';
import toast from 'react-hot-toast';

const Register = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: ''
  });
  const [livePhoto, setLivePhoto] = useState(null);
  const [showCamera, setShowCamera] = useState(false);
  const [loading, setLoading] = useState(false);
  const webcamRef = useRef(null);
  const navigate = useNavigate();

  const capturePhoto = useCallback(() => {
    const imageSrc = webcamRef.current.getScreenshot();
    setLivePhoto(imageSrc);
    setShowCamera(false);
  }, [webcamRef]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!livePhoto) {
      toast.error('Please capture a live photo');
      return;
    }

    setLoading(true);
    try {
      const deviceInfo = {
        deviceId: navigator.userAgent,
        brand: navigator.platform,
        model: 'Web',
        os: navigator.userAgent
      };

      await api.post('/auth/register', {
        ...formData,
        livePhoto,
        deviceInfo
      });

      toast.success('Registration successful! Waiting for admin approval.');
      navigate('/login');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-pvchat-black flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-pvchat-blue rounded-2xl mx-auto mb-4 flex items-center justify-center">
            <span className="text-3xl font-bold text-white">PV</span>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Create Account</h1>
          <p className="text-pvchat-gray">Join PVChat securely</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Live Photo Capture */}
          <div className="card p-4">
            <label className="block text-sm font-medium text-pvchat-gray mb-2">
              Live Photo Verification
            </label>
            {showCamera ? (
              <div className="relative">
                <Webcam
                  ref={webcamRef}
                  screenshotFormat="image/jpeg"
                  className="w-full rounded-xl"
                  videoConstraints={{ facingMode: 'user' }}
                />
                <button
                  type="button"
                  onClick={capturePhoto}
                  className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-pvchat-blue text-white px-6 py-2 rounded-full"
                >
                  <FaCamera className="inline mr-2" />
                  Capture
                </button>
              </div>
            ) : livePhoto ? (
              <div className="relative">
                <img src={livePhoto} alt="Live" className="w-full rounded-xl" />
                <button
                  type="button"
                  onClick={() => { setLivePhoto(null); setShowCamera(true); }}
                  className="absolute top-2 right-2 bg-pvchat-dark p-2 rounded-full"
                >
                  <FaRedo className="text-white" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowCamera(true)}
                className="w-full h-40 border-2 border-dashed border-pvchat-gray-dark rounded-xl flex flex-col items-center justify-center text-pvchat-gray hover:border-pvchat-blue hover:text-pvchat-blue transition-all"
              >
                <FaCamera className="text-3xl mb-2" />
                <span>Take Live Photo</span>
              </button>
            )}
          </div>

          <div className="relative">
            <FaUser className="absolute left-4 top-1/2 -translate-y-1/2 text-pvchat-gray" />
            <input
              type="text"
              placeholder="Full Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="input-field pl-12"
              required
            />
          </div>

          <div className="relative">
            <FaEnvelope className="absolute left-4 top-1/2 -translate-y-1/2 text-pvchat-gray" />
            <input
              type="email"
              placeholder="Email address"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="input-field pl-12"
              required
            />
          </div>

          <div className="relative">
            <FaPhone className="absolute left-4 top-1/2 -translate-y-1/2 text-pvchat-gray" />
            <input
              type="tel"
              placeholder="Phone Number"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="input-field pl-12"
              required
            />
          </div>

          <div className="relative">
            <FaLock className="absolute left-4 top-1/2 -translate-y-1/2 text-pvchat-gray" />
            <input
              type="password"
              placeholder="Password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="input-field pl-12"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full"
          >
            {loading ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>

        <p className="text-center mt-6 text-pvchat-gray">
          Already have an account?{' '}
          <Link to="/login" className="text-pvchat-blue hover:text-pvchat-blue-light">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Register;