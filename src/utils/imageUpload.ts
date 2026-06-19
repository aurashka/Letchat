export async function uploadImageToImgBB(file: File): Promise<string> {
  const apiKey = "5fd2a4346ac2e5485a916a5d734d508b";
  const formData = new FormData();
  formData.append("image", file);

  try {
    const response = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`ImgBB upload failed: ${response.statusText}`);
    }

    const data = await response.json();
    if (data && data.data && data.data.url) {
      return data.data.url;
    } else {
      throw new Error("Invalid response format from ImgBB");
    }
  } catch (error) {
    console.error("Error in ImgBB upload:", error);
    throw error;
  }
}
