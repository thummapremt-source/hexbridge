'use client'
import { useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useRouter } from 'next/navigation'

export default function PostProject() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    project_type: '1bhk',
    room_sub_type: '',
    room_dimensions: '',
    bed_sizes: [],
    dressing_unit: false,
    plywood_brands: [],
    location: '',
    budget: '',
  })
  const [file, setFile] = useState(null)

  const projectTypes = ['single_room', '1bhk', '2bhk', '3bhk', '4bhk', '5bhk_plus', 'custom']
  const roomSubTypes = ['Kitchen', 'Bathroom', 'Living Room', 'Bedroom', 'Balcony', 'Office']
  const bedSizeOptions = ['King', 'Queen', 'XL', 'L', 'Single']
  const plywoodOptions = ['Century', 'Greenply', 'Royal', 'Gurjan 710 BWP', 'Action Tesa', 'Duroply', 'Other']

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  const handleMultiSelect = (e, field) => {
    const value = e.target.value
    setFormData(prev => {
      const current = prev[field]
      if (current.includes(value)) {
        return { ...prev, [field]: current.filter(item => item !== value) }
      } else {
        return { ...prev, [field]: [...current, value] }
      }
    })
  }

  const handleFileChange = (e) => {
    setFile(e.target.files[0])
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        alert('You must be logged in')
        router.push('/login')
        return
      }

      let floorPlanUrl = null

      // Upload floor plan ONLY if a file is selected
      if (file) {
        try {
          const fileExt = file.name.split('.').pop()
          const fileName = `${user.id}-${Date.now()}.${fileExt}`
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('project-images')
            .upload(fileName, file)

          if (uploadError) {
            console.error('Upload error:', uploadError)
            alert('Failed to upload floor plan. Project will be posted without it.')
          } else {
            const { data: urlData } = supabase.storage
              .from('project-images')
              .getPublicUrl(fileName)
            floorPlanUrl = urlData.publicUrl
          }
        } catch (uploadErr) {
          console.error('Upload error:', uploadErr)
          alert('Error uploading file. Project will be posted without it.')
        }
      }

      // Insert project
      const { data, error } = await supabase
        .from('projects')
        .insert({
          homeowner_id: user.id,
          title: formData.title,
          description: formData.description,
          project_type: formData.project_type,
          room_sub_type: formData.room_sub_type,
          floor_plan_url: floorPlanUrl,
          room_dimensions: formData.room_dimensions,
          bed_sizes: formData.bed_sizes,
          dressing_unit: formData.dressing_unit,
          plywood_brands: formData.plywood_brands,
          location: formData.location,
          status: 'open'
        })
        .select()

      if (error) {
        console.error('Project error:', error)
        alert('Failed to create project: ' + error.message)
        setLoading(false)
        return
      }

      console.log('Project created:', data)
      alert('✅ Project posted successfully!')
      router.push('/dashboard/browse')
    } catch (error) {
      console.error('Unexpected error:', error)
      alert('An unexpected error occurred: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-xl p-8">
        <h1 className="text-3xl font-bold text-[#1a2a3a] mb-6">📝 Post a New Project</h1>
        <form onSubmit={handleSubmit} className="space-y-5">

          {/* Title */}
          <div>
            <label className="block font-semibold mb-1">Project Title *</label>
            <input name="title" value={formData.title} onChange={handleChange} 
              className="w-full p-3 border rounded-lg" placeholder="e.g., 2BHK Modern Kitchen Renovation" required />
          </div>

          {/* Description */}
          <div>
            <label className="block font-semibold mb-1">Description *</label>
            <textarea name="description" value={formData.description} onChange={handleChange} rows="4"
              className="w-full p-3 border rounded-lg" placeholder="Describe your requirements in detail..." required />
          </div>

          {/* Project Type */}
          <div>
            <label className="block font-semibold mb-1">Project Type *</label>
            <select name="project_type" value={formData.project_type} onChange={handleChange} className="w-full p-3 border rounded-lg" required>
              {projectTypes.map(type => (
                <option key={type} value={type}>{type.replace('_', ' ').toUpperCase()}</option>
              ))}
            </select>
          </div>

          {/* Room Sub Type (for single_room) */}
          {formData.project_type === 'single_room' && (
            <div>
              <label className="block font-semibold mb-1">Room Type</label>
              <select name="room_sub_type" value={formData.room_sub_type} onChange={handleChange} className="w-full p-3 border rounded-lg">
                <option value="">Select Room</option>
                {roomSubTypes.map(room => <option key={room} value={room}>{room}</option>)}
              </select>
            </div>
          )}

          {/* Floor Plan Upload (Optional) */}
          <div>
            <label className="block font-semibold mb-1">Upload Floor Plan (Optional)</label>
            <input type="file" accept="image/*,application/pdf" onChange={handleFileChange} className="w-full p-2 border rounded-lg" />
          </div>

          {/* Room Dimensions */}
          <div>
            <label className="block font-semibold mb-1">Room Dimensions (Optional)</label>
            <input name="room_dimensions" value={formData.room_dimensions} onChange={handleChange}
              className="w-full p-3 border rounded-lg" placeholder="e.g., Living: 15x12, Bed1: 12x10" />
          </div>

          {/* Bed Sizes */}
          <div>
            <label className="block font-semibold mb-1">Bed Sizes Required</label>
            <div className="flex flex-wrap gap-2">
              {bedSizeOptions.map(size => (
                <label key={size} className="flex items-center gap-2 bg-gray-100 px-3 py-2 rounded-lg cursor-pointer">
                  <input type="checkbox" value={size} onChange={(e) => handleMultiSelect(e, 'bed_sizes')} />
                  {size}
                </label>
              ))}
            </div>
          </div>

          {/* Dressing Unit */}
          <div>
            <label className="flex items-center gap-2">
              <input type="checkbox" name="dressing_unit" checked={formData.dressing_unit} onChange={handleChange} />
              <span className="font-semibold">Dressing Unit Required</span>
            </label>
          </div>

          {/* Plywood Brands */}
          <div>
            <label className="block font-semibold mb-1">Preferred Plywood Brands</label>
            <div className="flex flex-wrap gap-2">
              {plywoodOptions.map(brand => (
                <label key={brand} className="flex items-center gap-2 bg-gray-100 px-3 py-2 rounded-lg cursor-pointer">
                  <input type="checkbox" value={brand} onChange={(e) => handleMultiSelect(e, 'plywood_brands')} />
                  {brand}
                </label>
              ))}
            </div>
          </div>

          {/* Location */}
          <div>
            <label className="block font-semibold mb-1">Location (City, State) *</label>
            <input name="location" value={formData.location} onChange={handleChange}
              className="w-full p-3 border rounded-lg" placeholder="e.g., Mumbai, Maharashtra" required />
          </div>

          <button type="submit" disabled={loading}
            className="w-full bg-[#d4a843] text-white py-3 rounded-lg font-bold hover:bg-[#c49a3a] transition disabled:opacity-50">
            {loading ? 'Posting...' : '🚀 Post Project'}
          </button>
        </form>
      </div>
    </div>
  )
}