import React from 'react';
import { BookOpen } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import pb from '@/lib/pocketbaseClient';

// Safe URL getter to support getURL while preventing crashes if the SDK expects getUrl
const getCourseImageURL = (record, filename) => {
  if (pb.files.getURL) {
    return pb.files.getURL(record, filename);
  }
  return pb.files.getUrl(record, filename);
};

const CourseCard = ({ course, onClick }) => {
  const imageUrl = course.portada ? getCourseImageURL(course, course.portada) : null;

  return (
    <Card 
      onClick={onClick} 
      className="cursor-pointer group hover:shadow-lg transition-all duration-300 hover:-translate-y-1 overflow-hidden flex flex-col h-full"
    >
      <div className="h-40 w-full bg-muted relative overflow-hidden">
        {imageUrl ? (
          <img 
            src={imageUrl} 
            alt={course.nombre} 
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-primary/10">
            <BookOpen className="h-12 w-12 text-primary/40" />
          </div>
        )}
      </div>
      <CardHeader>
        <CardTitle className="line-clamp-2 text-xl">{course.nombre}</CardTitle>
      </CardHeader>
      <CardContent className="mt-auto pb-6">
        <CardDescription className="line-clamp-3 text-sm leading-relaxed">
          {course.descripcion}
        </CardDescription>
      </CardContent>
    </Card>
  );
};

export default CourseCard;