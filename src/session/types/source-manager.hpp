#pragma once

#include <memory>
#include <mutex>
#include <string>

namespace pdal
{
    class Options;
    class Reader;
    class StageFactory;
}

namespace entwine
{
    class Bounds;
    class Schema;
}

class SourceManager
{
public:
    SourceManager(
            pdal::StageFactory& stageFactory,
            std::mutex& factoryMutex,
            std::string path,
            std::string driver);

    std::unique_ptr<pdal::Reader> createReader();

    std::size_t numPoints() const { return m_numPoints; }
    const entwine::Schema& schema() const { return *m_schema; }
    const entwine::Bounds& bounds() const { return *m_bounds; }
    const std::string& srs() const { return m_srs; }

private:
    pdal::StageFactory& m_stageFactory;
    std::mutex& m_factoryMutex;
    std::unique_ptr<pdal::Options> m_options;

    std::string m_driver;
    std::unique_ptr<entwine::Schema> m_schema;
    std::unique_ptr<entwine::Bounds> m_bounds;
    std::size_t m_numPoints;
    std::string m_srs;
};

