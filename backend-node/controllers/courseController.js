import Course from "../models/Course.js";

const createCourse = async (req, res) => {
  try {
    const { title, description } = req.body;

    if (!title) {
      return res.status(400).json({ error: "Course title is required" });
    }

    const course = new Course({
      title,
      description,
      instructorId: req.user._id,
    });

    await course.save();
    return res
      .status(201)
      .json({ message: "Course created successfully", course });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

const getCourses = async (req, res) => {
  try {
    const courses = await Course.find().populate("instructorId", "name");
    return res.status(200).json(courses);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};


const getCourseById = async (req, res) => {
  try {
    const course = await Course.findById(req.params.courseId)
      .populate("instructorId", "name")
      .populate("lectures");
    if (!course) {
      return res.status(404).json({ error: "Course not found" });
    }
    return res.status(200).json(course);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

export { createCourse, getCourses, getCourseById };
