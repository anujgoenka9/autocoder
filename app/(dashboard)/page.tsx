'use client'

import { Plus, FolderOpen, Zap, Code, Palette, Smartphone } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import SuggestionChat from '@/components/SuggestionChat';

export default function HomePage() {
  const recentProjects = [
    { id: 1, name: "E-commerce Store", lastModified: "2 hours ago" },
    { id: 2, name: "Portfolio Website", lastModified: "1 day ago" },
    { id: 3, name: "Task Manager App", lastModified: "3 days ago" },
  ];

  const features = [
    {
      icon: Code,
      title: "AI-Powered Development",
      description: "Build web applications with natural language instructions"
    },
    {
      icon: Zap,
      title: "Lightning Fast",
      description: "See your changes in real-time with instant preview"
    },
    {
      icon: Palette,
      title: "Beautiful Designs",
      description: "Modern, responsive designs built with Tailwind CSS"
    },
    {
      icon: Smartphone,
      title: "Mobile Ready",
      description: "All projects are optimized for mobile devices"
    }
  ];

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold mb-4 text-ai-primary">
            Build Amazing Web Apps
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Transform your ideas into beautiful, functional web applications using the power of AI. 
            No coding experience required.
          </p>
          <Link href="/projects">
            <Button size="lg" className="bg-gradient-primary hover:opacity-90 text-white">
              <Zap className="w-5 h-5 mr-2" />
              Get Started
            </Button>
          </Link>
        </div>

        {/* AI Suggestion Chat */}
        <div className="mb-12">
          <SuggestionChat />
        </div>



        {/* Recent Projects */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold text-foreground">Recent Projects</h2>
            <Link href="/projects">
              <Button variant="outline" size="sm" className="border-border hover:bg-accent">
                <FolderOpen className="w-4 h-4 mr-2" />
                View All
              </Button>
            </Link>
          </div>
          
          {recentProjects.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {recentProjects.map((project) => (
                <Card key={project.id} className="group cursor-pointer hover:shadow-lg transition-shadow duration-300 bg-card border-border">
                  <CardHeader>
                    <div className="aspect-video bg-secondary rounded-lg mb-4 flex items-center justify-center">
                      <Code className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <CardTitle className="text-lg group-hover:text-ai-primary transition-colors text-card-foreground">
                      {project.name}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Last modified {project.lastModified}
                    </p>
                  </CardHeader>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="text-center py-12 bg-card border-border">
              <CardContent>
                <div className="w-16 h-16 bg-secondary rounded-full flex items-center justify-center mx-auto mb-4">
                  <Plus className="w-8 h-8 text-muted-foreground" />
                </div>
                <CardTitle className="mb-2 text-card-foreground">No projects yet</CardTitle>
                <p className="text-muted-foreground mb-4">
                  Create your first project to get started
                </p>
                <Link href="/projects">
                  <Button className="bg-gradient-primary hover:opacity-90 text-white">
                    <Plus className="w-4 h-4 mr-2" />
                    Create Project
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {features.map((feature, index) => (
            <Card key={index} className="hover:shadow-lg transition-shadow duration-300 bg-card border-border">
              <CardHeader className="text-center">
                <div className="w-12 h-12 bg-gradient-primary rounded-lg flex items-center justify-center mx-auto mb-4">
                  <feature.icon className="w-6 h-6 text-white" />
                </div>
                <CardTitle className="text-lg text-card-foreground">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-center text-muted-foreground">
                  {feature.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Call to Action */}
        <section className="py-16 bg-card rounded-lg shadow-sm border border-border">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-card-foreground mb-4">
              Ready to start building?
            </h2>
            <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
              Join thousands of creators who are already building amazing web applications 
              with our AI-powered platform.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/pricing">
                <Button size="lg" variant="outline" className="rounded-full border-border hover:bg-accent">
                  View Pricing
                </Button>
              </Link>
              <Link href="/projects">
                <Button size="lg" className="bg-gradient-primary hover:opacity-90 text-white rounded-full">
                  Start Building
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
