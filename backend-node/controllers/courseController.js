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
    const filter = req.user.role === 'instructor' ? { instructorId: req.user._id } : { published: true };
    if (req.query.enrolled === 'true' && req.user.role === 'student') filter.students = req.user._id;
    const courses = await Course.find(filter).select('-students').sort({createdAt: -1}).populate("instructorId", "name");
    return res.status(200).json(courses);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};


const getCourseById = async (req, res) => {
  try {
    const course = await Course.findOne({ _id: req.params.courseId, ...(req.user.role === 'instructor' ? {instructorId: req.user._id} : {published: true}) })
      .populate("instructorId", "name")
      .populate("lectures", "title fileType status transcriptStatus quizStatus");
    if (!course) {
      return res.status(404).json({ error: "Course not found" });
    }
    const { students = [], ...details } = course.toObject();
    return res.json({ ...details, enrolled: students.some(id => id.equals(req.user._id)), enrollmentCount: req.user.role === 'instructor' ? students.length : undefined });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

export { createCourse, getCourses, getCourseById };
