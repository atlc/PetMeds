const LoadingSpinner = () => {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="inline-flex items-center px-4 py-2 text-lg text-gray-600">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mr-3"></div>
          Loading PetMeds...
        </div>
      </div>
    </div>
  )
}

export default LoadingSpinner
